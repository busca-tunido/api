# Task: Review Helpful Votes Schema & Persistence (`api/tasks/023_review-helpful-votes-schema.md`)

## Execution Profile

- **Wave / Batch**: Wave 1
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Worker Agent (API Schema & Database)`
- **Dependencies (`depends_on`)**: `[]`
- **Collision Risk**: `LOW (Prisma schema and client generation)`

## Target Files

- **Exclusive**:
  - `prisma/schema.prisma`

## Objective

Add the database schema definition for user helpful votes on reviews (`ReviewHelpfulVote`), establishing relational integrity between `User` and `Review` to support real database persistence for review upvoting.

## Technical Specifications

1. **Schema Definition (`prisma/schema.prisma`)**:
   Add the `ReviewHelpfulVote` model:
   ```prisma
   model ReviewHelpfulVote {
     userId    String
     reviewId  String
     createdAt DateTime @default(now())

     user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
     review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

     @@id([userId, reviewId])
     @@index([reviewId])
     @@index([userId])
     @@map("review_helpful_votes")
   }
   ```

2. **Update Relations**:
   - In `User` model, add:
     ```prisma
     helpfulVotes ReviewHelpfulVote[]
     ```
   - In `Review` model, add:
     ```prisma
     helpfulVotes ReviewHelpfulVote[]
     ```

3. **Prisma Generation & Migration**:
   - Run `pnpm exec prisma generate` to update Prisma Client types.
   - Run `pnpm exec prisma db push` to synchronize the development database schema.

## Checklist

- [ ] Add `ReviewHelpfulVote` model to `prisma/schema.prisma`.
- [ ] Add `helpfulVotes` relation to `User` and `Review` models.
- [ ] Run Prisma generation and schema push.
- [ ] Stage exclusively target files and commit with `feat(prisma): add review helpful vote model and relations`.
