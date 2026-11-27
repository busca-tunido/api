import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma as MongoPrisma } from '@prisma/client';
import { type Prisma, ProposalStatus, Role } from '@prisma/sql-client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
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
  constructor(
    private readonly sqlPrisma: SqlPrismaService,
    private readonly prisma: PrismaService,
  ) {}

  async create(pensionId: string, dto: CreateProposalDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: pensionId, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    return this.sqlPrisma.pensionProposal.create({
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

    return this.sqlPrisma.pensionProposal.findMany({
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
      this.sqlPrisma.pensionProposal.count({ where }),
      this.sqlPrisma.pensionProposal.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          submittedBy: { select: PROPOSAL_SUBMITTER_SELECT },
          reviewedBy: { select: PROPOSAL_NAME_SELECT },
        },
      }),
    ]);

    const pensionIds = Array.from(new Set(items.map((item) => item.pensionId)));
    const pensions =
      pensionIds.length > 0
        ? await this.prisma.pension.findMany({
            where: { id: { in: pensionIds } },
            select: {
              id: true,
              title: true,
              address: true,
              city: true,
            },
          })
        : [];
    const pensionMap = new Map(pensions.map((pension) => [pension.id, pension]));

    const enrichedItems = items.map((item) => ({
      ...item,
      pension: pensionMap.get(item.pensionId) ?? null,
    }));

    const totalPages = Math.ceil(total / safeLimit) || 1;
    const hasMore = skip + safeLimit < total;

    return {
      items: enrichedItems,
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
    const proposal = await this.sqlPrisma.pensionProposal.findUnique({
      where: { id },
      include: {
        submittedBy: { select: PROPOSAL_SUBMITTER_SELECT },
        reviewedBy: { select: PROPOSAL_NAME_SELECT },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal '${id}' not found`);
    }

    const pension = await this.prisma.pension.findUnique({
      where: { id: proposal.pensionId },
    });

    const proposed = (proposal.proposedChanges || {}) as Record<string, unknown>;
    const pensionRecord = (pension ?? {}) as unknown as Record<string, unknown>;
    const diff: Record<string, { current: unknown; proposed: unknown }> = {};

    for (const key of Object.keys(proposed)) {
      if (key === 'amenitiesToAdd' || key === 'amenitiesToRemove') {
        continue;
      }
      diff[key] = {
        current: pensionRecord[key] ?? null,
        proposed: proposed[key],
      };
    }

    return {
      proposal: {
        ...proposal,
        pension: pension ?? null,
      },
      diff,
    };
  }

  async review(id: string, dto: ReviewProposalDto, reviewer: SanitizedUser): Promise<unknown> {
    const proposal = await this.sqlPrisma.pensionProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal '${id}' not found`);
    }

    const pension = await this.prisma.pension.findUnique({
      where: { id: proposal.pensionId },
      select: {
        id: true,
        landlordId: true,
      },
    });

    if (
      reviewer.role !== Role.ADMIN &&
      reviewer.role !== Role.MODERATOR &&
      pension?.landlordId !== reviewer.id
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

      return this.sqlPrisma.pensionProposal.update({
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

    const { amenitiesToAdd, amenitiesToRemove, ...directFields } = changesToApply;

    const updateData: MongoPrisma.PensionUpdateInput = {
      ...directFields,
    };

    if (Array.isArray(amenitiesToAdd) || Array.isArray(amenitiesToRemove)) {
      const currentPension = await this.prisma.pension.findUnique({
        where: { id: proposal.pensionId },
        select: { amenities: true },
      });
      const currentSet = new Set(currentPension?.amenities || []);
      if (Array.isArray(amenitiesToAdd)) {
        for (const amenity of amenitiesToAdd) {
          if (typeof amenity === 'string') {
            currentSet.add(amenity);
          }
        }
      }
      if (Array.isArray(amenitiesToRemove)) {
        for (const amenity of amenitiesToRemove) {
          if (typeof amenity === 'string') {
            currentSet.delete(amenity);
          }
        }
      }
      updateData.amenities = Array.from(currentSet);
    }

    await this.prisma.pension.update({
      where: { id: proposal.pensionId },
      data: updateData,
    });

    return this.sqlPrisma.pensionProposal.update({
      where: { id },
      data: {
        status:
          dto.action === 'APPROVE' ? ProposalStatus.APPROVED : ProposalStatus.MODIFIED_AND_APPROVED,
        appliedChanges: changesToApply as Prisma.InputJsonValue,
        reviewNotes: dto.reviewNotes,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
      },
    });
  }
}
