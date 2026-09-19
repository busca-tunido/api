# Task: Landlord Proposal Review Authorization Permissions

## Execution Profile

- **Wave / Batch**: Wave 1 (Backend Core)
- **Execution Mode**: `PARALLEL`
- **Assigned Role**: `Worker Agent (API Proposals Module)`
- **Dependencies (`depends_on`)**: `[]`
- **Collision Risk**: `LOW`

## Target Files

- **Exclusive**:
  - `src/proposals/proposals.controller.ts`
  - `src/proposals/proposals.service.ts`

## Objective

Authorize property owners (landlords) to review, approve, and reject community edit proposals submitted for their own pensions:
1. Update `PATCH /proposals/:id/review` route permissions to allow `LANDLORD` in addition to `ADMIN`.
2. In `ProposalsService.reviewProposal`, verify that if the caller has role `LANDLORD`, they must be the recorded owner (`ownerId`) of the pension referenced by the proposal (`proposal.pension.ownerId === user.id`). If not, throw `ForbiddenException`.
3. If the caller has role `ADMIN`, bypass ownership verification and permit review.

## Technical Specifications

1. **`ProposalsController` (`src/proposals/proposals.controller.ts`)**:
   - Update `@Roles` decorator on `@Patch(':id/review')`:
     ```ts
     @Roles(UserRole.ADMIN, UserRole.LANDLORD)
     ```
   - Pass the authenticated user (`@CurrentUser() user: AuthenticatedUser`) to `proposalsService.reviewProposal`.

2. **`ProposalsService` (`src/proposals/proposals.service.ts`)**:
   - In `reviewProposal(proposalId: string, dto: ReviewProposalDto, user: AuthenticatedUser)`:
     - Fetch proposal including pension relation:
       ```ts
       const proposal = await this.prisma.communityEditProposal.findUnique({
         where: { id: proposalId },
         include: { pension: { select: { id: true, ownerId: true } } },
       });
       ```
     - If not found, throw `NotFoundException`.
     - Check authorization:
       ```ts
       if (user.role !== UserRole.ADMIN && proposal.pension.ownerId !== user.id) {
         throw new ForbiddenException('No tienes permisos para revisar sugerencias de esta pensión');
       }
       ```
     - Proceed with status update (`APPROVED` or `REJECTED`) and apply proposed changes if approved.

## Checklist

- [ ] Update `@Roles(UserRole.ADMIN, UserRole.LANDLORD)` on `PATCH :id/review` in `src/proposals/proposals.controller.ts`.
- [ ] Implement pension ownership validation in `ProposalsService.reviewProposal`.
- [ ] Allow admins to review any proposal while restricting landlords to their own pensions.
- [ ] Stage target files and commit with `feat(proposals): authorize pension owners to review community edit proposals`.
