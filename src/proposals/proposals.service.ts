import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma, ProposalStatus } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateProposalDto } from './dto/create-proposal.dto.js';
import type { ReviewProposalDto } from './dto/review-proposal.dto.js';

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
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findByPension(pensionId: string): Promise<unknown[]> {
    return this.prisma.pensionProposal.findMany({
      where: { pensionId },
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findModerationProposals(
    status?: ProposalStatus,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: unknown[]; total: number; page: number; limit: number; totalPages: number }> {
    const where: Prisma.PensionProposalWhereInput = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.pensionProposal.count({ where }),
      this.prisma.pensionProposal.findMany({
        where,
        skip,
        take: limit,
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
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findProposalWithDiff(id: string): Promise<unknown> {
    const proposal = await this.prisma.pensionProposal.findUnique({
      where: { id },
      include: {
        pension: {
          include: {
            amenities: { select: { slug: true, name: true, category: true } },
          },
        },
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
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
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal '${id}' not found`);
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
        const connect = Array.isArray(amenitiesToAdd)
          ? (amenitiesToAdd as string[]).map((s) => ({ slug: s }))
          : undefined;
        const disconnect = Array.isArray(amenitiesToRemove)
          ? (amenitiesToRemove as string[]).map((s) => ({ slug: s }))
          : undefined;

        updateData.amenities = {
          connect,
          disconnect,
        };
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
