# Task: Community Change Proposals & Suggested Edits System (`api/tasks/pension-change-proposals-moderation.md`)

## Objective

Implement a community-driven change proposal ("Pull Request") architecture for student housing. Students and residents can propose corrections, add missing amenities, update house rules, or propose full publication updates. Moderators can review diffs, approve, reject, or modify proposals before merging them automatically into active listings.

---

## Technical Specifications

### 1. Prisma Schema Additions (`prisma/schema.prisma`)
```prisma
enum ProposalStatus {
  PENDING
  APPROVED
  REJECTED
  MODIFIED_AND_APPROVED
}

enum ProposalType {
  AMENITIES_UPDATE
  BASIC_INFO
  LOCATION_UPDATE
  FULL_UPDATE
}

model PensionProposal {
  id              String         @id @default(uuid())
  pensionId       String
  submittedById   String
  reviewedById    String?
  type            ProposalType   @default(BASIC_INFO)
  status          ProposalStatus @default(PENDING)
  proposedChanges Json
  appliedChanges  Json?
  submissionNotes String?
  reviewNotes     String?
  createdAt       DateTime       @default(now())
  reviewedAt      DateTime?

  pension         Pension        @relation(fields: [pensionId], references: [id], onDelete: Cascade)
  submittedBy     User           @relation("SubmittedProposals", fields: [submittedById], references: [id], onDelete: Cascade)
  reviewedBy      User?          @relation("ReviewedProposals", fields: [reviewedById], references: [id], onDelete: SetNull)

  @@index([pensionId])
  @@index([status])
  @@map("pension_proposals")
}
```

### 2. Endpoints
- `POST /pensions/:id/proposals`: Authenticated user submits a change proposal with typed JSON diff.
- `GET /pensions/:id/proposals`: View history of suggestions for a specific pension.
- `GET /moderation/proposals`: List pending proposals with status filter and pagination (Moderators/Admins only).
- `GET /moderation/proposals/:id`: Inspect proposal diff comparing current pension state with `proposedChanges`.
- `PATCH /moderation/proposals/:id/review`:
  - `APPROVE`: Runs a `prisma.$transaction` applying proposed changes directly to the `Pension` record.
  - `REJECT`: Rejects with mandatory `reviewNotes`.
  - `MODIFY_AND_APPROVE`: Moderator overrides specific fields and applies only the vetted subset.

---

## Checklist

- [ ] Add `PensionProposal` model and enums to `prisma/schema.prisma`.
- [ ] Run `prisma db push` to synchronize local database.
- [ ] Update `prisma/seed.ts` and `prisma/seed-test.ts` to include `"pension_proposals"` in the TRUNCATE CASCADE list.
- [ ] Seed 2-3 sample proposals in `prisma/seed-test.ts` for local moderator development and testing.
- [ ] Create `ProposalsModule` with controller, service, and DTOs (`CreateProposalDto`, `ReviewProposalDto`).
- [ ] Implement atomic merge logic inside `prisma.$transaction` in `ProposalsService`.
- [ ] Restrict review endpoints to `Role.MODERATOR` and `Role.ADMIN`.
- [ ] Add unit tests in `src/proposals/proposals.service.spec.ts`.
- [ ] Validate code quality with Biome (`pnpm run check && pnpm run review`).
- [ ] Verify build with `pnpm exec nest build`.

---

## Target Files

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/seed-test.ts`
- `src/proposals/proposals.module.ts`
- `src/proposals/proposals.controller.ts`
- `src/proposals/proposals.service.ts`
- `src/proposals/dto/create-proposal.dto.ts`
- `src/proposals/dto/review-proposal.dto.ts`
- `src/proposals/proposals.service.spec.ts`
- `src/app.module.ts`
