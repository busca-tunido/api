import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma, ProposalStatus, Role } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProposalDto } from './dto/create-proposal.dto.js';
import type { ReviewProposalDto } from './dto/review-proposal.dto.js';

const PROPOSAL_SUBMITTER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

const PROPOSAL_NAME_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(pensionId: string, dto: CreateProposalDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: pensionId, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    return this.prisma.pensionProposal.create({
      data: {
        pensionId,
        submittedById: user.id,
        type: dto.type,
        proposedChanges: dto.proposedChanges as Prisma.InputJsonValue,
        submissionNotes: dto.submissionNotes,
      },
      include: {
        submittedBy: { select: PROPOSAL_SUBMITTER_SELECT },
      },
    });
  }

  async findByPension(
    pensionId: string,
    user?: SanitizedUser,
    status?: ProposalStatus,
  ): Promise<unknown[]> {
    if (user && user.role !== Role.ADMIN && user.role !== Role.MODERATOR) {
      const pension = await this.prisma.pension.findUnique({
        where: { id: pensionId, deletedAt: null },
        select: { id: true, landlordId: true },
      });
      if (!pension) {
        throw new NotFoundException(`Pension '${pensionId}' not found`);
      }
      if (pension.landlordId !== user.id) {
        throw new ForbiddenException('No tienes permisos para ver sugerencias de esta pensión');
      }
    }

    return this.prisma.pensionProposal.findMany({
      where: {
        pensionId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: { select: PROPOSAL_NAME_SELECT },
        reviewedBy: { select: PROPOSAL_NAME_SELECT },
      },
    });
  }

  async findModerationProposals(
    status?: ProposalStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: unknown[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(100, Math.max(1, limit || 20));
    const where: Prisma.PensionProposalWhereInput = status ? { status } : {};
    const skip = (safePage - 1) * safeLimit;

    const [total, items] = await Promise.all([
      this.prisma.pensionProposal.count({ where }),
      this.prisma.pensionProposal.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          pension: {
            select: {
              id: true,
              title: true,
              address: true,
              city: true,
            },
          },
          submittedBy: { select: PROPOSAL_SUBMITTER_SELECT },
          reviewedBy: { select: PROPOSAL_NAME_SELECT },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 1;
    const hasMore = skip + safeLimit < total;

    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasMore,
      },
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasMore,
    };
  }

  async findProposalWithDiff(id: string): Promise<unknown> {
    const proposal = await this.prisma.pensionProposal.findUnique({
      where: { id },
      include: {
        pension: true,
        submittedBy: { select: PROPOSAL_SUBMITTER_SELECT },
        reviewedBy: { select: PROPOSAL_NAME_SELECT },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal '${id}' not found`);
    }

    const proposed = (proposal.proposedChanges || {}) as Record<string, unknown>;
    const pension = proposal.pension as unknown as Record<string, unknown>;
    const diff: Record<string, { current: unknown; proposed: unknown }> = {};

    for (const key of Object.keys(proposed)) {
      if (key === 'amenitiesToAdd' || key === 'amenitiesToRemove') {
        continue;
      }
      diff[key] = {
        current: pension[key] ?? null,
        proposed: proposed[key],
      };
    }

    return {
      proposal,
      diff,
    };
  }

  async review(id: string, dto: ReviewProposalDto, reviewer: SanitizedUser): Promise<unknown> {
    const proposal = await this.prisma.pensionProposal.findUnique({
      where: { id },
      include: {
        pension: {
          select: {
            id: true,
            landlordId: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal '${id}' not found`);
    }

    if (
      reviewer.role !== Role.ADMIN &&
      reviewer.role !== Role.MODERATOR &&
      proposal.pension?.landlordId !== reviewer.id
    ) {
      throw new ForbiddenException('No tienes permisos para revisar sugerencias de esta pensión');
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException(`Proposal '${id}' is already resolved (${proposal.status})`);
    }

    if (dto.action === 'REJECT') {
      if (!dto.reviewNotes) {
        throw new BadRequestException('Review notes are required when rejecting a proposal');
      }

      return this.prisma.pensionProposal.update({
        where: { id },
        data: {
          status: ProposalStatus.REJECTED,
          reviewNotes: dto.reviewNotes,
          reviewedById: reviewer.id,
          reviewedAt: new Date(),
        },
      });
    }

    const changesToApply =
      dto.action === 'MODIFY_AND_APPROVE' && dto.modifiedChanges
        ? dto.modifiedChanges
        : ((proposal.proposedChanges || {}) as Record<string, unknown>);

    return this.prisma.$transaction(async (tx) => {
      const { amenitiesToAdd, amenitiesToRemove, ...directFields } = changesToApply;

      const updateData: Prisma.PensionUpdateInput = {
        ...directFields,
      };

      if (Array.isArray(amenitiesToAdd) || Array.isArray(amenitiesToRemove)) {
        const currentPension = await tx.pension.findUnique({
          where: { id: proposal.pensionId },
          select: { amenities: true },
        });
        const currentSet = new Set(currentPension?.amenities || []);
        if (Array.isArray(amenitiesToAdd)) {
          for (const a of amenitiesToAdd as string[]) currentSet.add(a);
        }
        if (Array.isArray(amenitiesToRemove)) {
          for (const r of amenitiesToRemove as string[]) currentSet.delete(r);
        }
        updateData.amenities = Array.from(currentSet);
      }

      await tx.pension.update({
        where: { id: proposal.pensionId },
        data: updateData,
      });

      return tx.pensionProposal.update({
        where: { id },
        data: {
          status:
            dto.action === 'APPROVE'
              ? ProposalStatus.APPROVED
              : ProposalStatus.MODIFIED_AND_APPROVED,
          appliedChanges: changesToApply as Prisma.InputJsonValue,
          reviewNotes: dto.reviewNotes,
          reviewedById: reviewer.id,
          reviewedAt: new Date(),
        },
      });
    });
  }
}
