/**
 * rewrite-returning.cjs
 * 
 * Rewrites all Drizzle `.returning()` calls in storage.db.ts to MySQL-compatible
 * INSERT-then-SELECT and UPDATE-then-SELECT patterns.
 * 
 * MySQL Drizzle does NOT support .returning() — it's PostgreSQL-only.
 * 
 * Strategy:
 *   INSERT: capture insertId from ResultSetHeader, then SELECT by id
 *   UPDATE: remove .returning(), then SELECT by the WHERE condition id
 *   DELETE: remove .returning() (callers use boolean return, not the deleted row)
 */

const fs = require('fs');

let content = fs.readFileSync('server/storage.db.ts', 'utf8');

// ─── Utility: count occurrences ────────────────────────────────────────────
const countOf = (str, sub) => (str.match(new RegExp(sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

console.log('Before:', countOf(content, '.returning()'), '.returning() calls');

// ─── Pattern replacements ──────────────────────────────────────────────────
// We work on known, named patterns from the grep output.

// 1. createUser — INSERT users
content = content.replace(
  `    const [newUser] = await db.insert(users).values(user).returning();\n`,
  `    const [insertResult] = await db.insert(users).values(user);\n    const [newUser] = await db.select().from(users).where(eq(users.id, (insertResult as any).insertId));\n`
);

// 2. updateUserProfile — UPDATE users returning
content = content.replace(
  `    const [updatedUser] = await db\n      .update(users)\n      .set({\n        ...allowedFields,\n        updatedAt: new Date(),\n      })\n      .where(eq(users.id, userIdInt))\n      .returning();\n\n    return updatedUser;`,
  `    await db\n      .update(users)\n      .set({\n        ...allowedFields,\n        updatedAt: new Date(),\n      })\n      .where(eq(users.id, userIdInt));\n    const [updatedUser] = await db.select().from(users).where(eq(users.id, userIdInt));\n\n    return updatedUser;`
);

// 3. updateUserPoints — UPDATE users returning
content = content.replace(
  `    // Update user points\n    const [updatedUser] = await db\n      .update(users)\n      .set({\n        points: newPoints,\n        level: newLevel,\n        progress: newProgress,\n        updatedAt: new Date(),\n      })\n      .where(eq(users.id, userIdInt))\n      .returning();`,
  `    // Update user points\n    await db\n      .update(users)\n      .set({\n        points: newPoints,\n        level: newLevel,\n        progress: newProgress,\n        updatedAt: new Date(),\n      })\n      .where(eq(users.id, userIdInt));\n    const [updatedUser] = await db.select().from(users).where(eq(users.id, userIdInt));`
);

// 4. updateUserRole — UPDATE users returning
content = content.replace(
  `    const [updatedUser] = await db\n      .update(users)\n      .set({ role, updatedAt: new Date() })\n      .where(eq(users.id, userId))\n      .returning();\n\n    return updatedUser;`,
  `    await db\n      .update(users)\n      .set({ role, updatedAt: new Date() })\n      .where(eq(users.id, userId));\n    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));\n\n    return updatedUser;`
);

// 5. updateUserPassword — UPDATE users returning
content = content.replace(
  `    const [updatedUser] = await db\n      .update(users)\n      .set({ password, updatedAt: new Date() })\n      .where(eq(users.id, userId))\n      .returning();\n\n    return updatedUser;`,
  `    await db\n      .update(users)\n      .set({ password, updatedAt: new Date() })\n      .where(eq(users.id, userId));\n    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));\n\n    return updatedUser;`
);

// 6. addTask — INSERT tasks
content = content.replace(
  `    const [newTask] = await db.insert(tasks).values(task).returning();\n    return newTask;`,
  `    const [taskInsertResult] = await db.insert(tasks).values(task);\n    const [newTask] = await db.select().from(tasks).where(eq(tasks.id, (taskInsertResult as any).insertId));\n    return newTask!;`
);

// 7. updateTask — UPDATE tasks returning
content = content.replace(
  `    const [updatedTask] = await db\n      .update(tasks)\n      .set(taskData)\n      .where(eq(tasks.id, taskId))\n      .returning();\n\n    return updatedTask;`,
  `    await db\n      .update(tasks)\n      .set(taskData)\n      .where(eq(tasks.id, taskId));\n    const [updatedTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));\n\n    return updatedTask;`
);

// 8. completeTask — INSERT userTasks returning (inside transaction)
content = content.replace(
  `      const [userTask] = await db\n        .insert(userTasks)\n        .values({\n          userId,\n          taskId,\n          completedAt: now,\n          pointsEarned: task.points,\n          verificationStatus: \"pending\",\n        })\n        .returning();\n\n      // Update user's daily tasks completed count`,
  `      const [utInsertResult] = await db\n        .insert(userTasks)\n        .values({\n          userId,\n          taskId,\n          completedAt: now,\n          pointsEarned: task.points,\n          verificationStatus: \"pending\",\n        });\n      const [userTask] = await db.select().from(userTasks).where(eq(userTasks.id, (utInsertResult as any).insertId));\n\n      // Update user's daily tasks completed count`
);

// 9. createUserMilestone — INSERT userMilestones returning
content = content.replace(
  `    const [userMilestone] = await db\n      .insert(userMilestones)\n      .values({\n        userId,\n        milestoneId,\n        progress: 0,\n        completed: false,\n        rewardClaimed: false,\n      })\n      .returning();\n\n    return userMilestone;`,
  `    const [umInsertResult] = await db\n      .insert(userMilestones)\n      .values({\n        userId,\n        milestoneId,\n        progress: 0,\n        completed: false,\n        rewardClaimed: false,\n      });\n    const [userMilestone] = await db.select().from(userMilestones).where(eq(userMilestones.id, (umInsertResult as any).insertId));\n\n    return userMilestone!;`
);

// 10. addMilestone — INSERT milestones returning
content = content.replace(
  `    const [newMilestone] = await db\n      .insert(milestones)\n      .values(milestone)\n      .returning();\n\n    // Create user milestone entries for all users`,
  `    const [msInsertResult] = await db\n      .insert(milestones)\n      .values(milestone);\n    const [newMilestone] = await db.select().from(milestones).where(eq(milestones.id, (msInsertResult as any).insertId));\n\n    // Create user milestone entries for all users`
);

// 11. updateMilestone — UPDATE milestones returning
content = content.replace(
  `    const [updatedMilestone] = await db\n      .update(milestones)\n      .set(milestoneData)\n      .where(eq(milestones.id, milestoneId))\n      .returning();\n\n    return updatedMilestone;`,
  `    await db\n      .update(milestones)\n      .set(milestoneData)\n      .where(eq(milestones.id, milestoneId));\n    const [updatedMilestone] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));\n\n    return updatedMilestone;`
);

// 12. createAdmin — INSERT admins
content = content.replace(
  `    const [newAdmin] = await db.insert(admins).values(admin).returning();\n`,
  `    const [adminInsertResult] = await db.insert(admins).values(admin);\n    const [newAdmin] = await db.select().from(admins).where(eq(admins.id, (adminInsertResult as any).insertId));\n`
);

// 13. updateAdmin role
content = content.replace(
  /const \[updatedAdmin\] = await db\s*\n\s*\.update\(admins\)\s*\n\s*\.set\(\{ role \}\)\s*\n\s*\.where\(eq\(admins\.id, adminId\)\)\s*\n\s*\.returning\(\);\s*\n\s*return updatedAdmin;/,
  `await db\n      .update(admins)\n      .set({ role })\n      .where(eq(admins.id, adminId));\n    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, adminId));\n    return updatedAdmin;`
);

// 14. updateAdmin password
content = content.replace(
  /const \[updatedAdmin\] = await db\s*\n\s*\.update\(admins\)\s*\n\s*\.set\(\{ password \}\)\s*\n\s*\.where\(eq\(admins\.id, adminId\)\)\s*\n\s*\.returning\(\);\s*\n\s*return updatedAdmin;/,
  `await db\n      .update(admins)\n      .set({ password })\n      .where(eq(admins.id, adminId));\n    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, adminId));\n    return updatedAdmin;`
);

// 15. updateAdmin username
content = content.replace(
  /const \[updatedAdmin\] = await db\s*\n\s*\.update\(admins\)\s*\n\s*\.set\(\{ username \}\)\s*\n\s*\.where\(eq\(admins\.id, adminId\)\)\s*\n\s*\.returning\(\);\s*\n\s*return updatedAdmin;/,
  `await db\n      .update(admins)\n      .set({ username })\n      .where(eq(admins.id, adminId));\n    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, adminId));\n    return updatedAdmin;`
);

// 16. updateAdmin lastLogin
content = content.replace(
  /const \[updatedAdmin\] = await db\s*\n\s*\.update\(admins\)\s*\n\s*\.set\(\{ lastLogin[^}]*\}\)\s*\n\s*\.where\(eq\(admins\.id, adminId\)\)\s*\n\s*\.returning\(\);\s*\n\s*return updatedAdmin;/s,
  `await db\n      .update(admins)\n      .set({ lastLogin: new Date() })\n      .where(eq(admins.id, adminId));\n    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, adminId));\n    return updatedAdmin;`
);

// 17. createPayout — INSERT payouts returning
content = content.replace(
  `    const result = await db.insert(payouts).values(payoutData).returning();\n`,
  `    const [payoutInsert] = await db.insert(payouts).values(payoutData);\n    const result = await db.select().from(payouts).where(eq(payouts.id, (payoutInsert as any).insertId));\n`
);

// 18. updateReferralTierStatus
content = content.replace(
  /const \[updatedTier\] = await db[\s\S]*?\.returning\(\);\s*\n\s*return updatedTier;/,
  `await db\n      .update(referralTiers)\n      .set(updateData)\n      .where(eq(referralTiers.id, tierId));\n    const [updatedTier] = await db.select().from(referralTiers).where(eq(referralTiers.id, tierId));\n    return updatedTier;`
);

// 19. createNotification — INSERT notifications
content = content.replace(
  `    const [result] = await db.insert(notifications).values(notification).returning();\n    return result;`,
  `    const [notifInsertResult] = await db.insert(notifications).values(notification);\n    const [result] = await db.select().from(notifications).where(eq(notifications.id, (notifInsertResult as any).insertId));\n    return result!;`
);

// 20. updateNotification — UPDATE notifications returning
content = content.replace(
  /const \[updated\] = await db\s*\n\s*\.update\(notifications\)[\s\S]*?\.returning\(\);\s*\n\s*return updated;/,
  `await db\n      .update(notifications)\n      .set({ isRead: true })\n      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));\n    const updated = await db.select().from(notifications).where(eq(notifications.userId, userId));\n    return updated;`
);

// 21. createClassroomVideo — INSERT classroomVideos
content = content.replace(
  `    const [video] = await db.insert(classroomVideos).values(data).returning();\n`,
  `    const [cvInsert] = await db.insert(classroomVideos).values(data);\n    const [video] = await db.select().from(classroomVideos).where(eq(classroomVideos.id, (cvInsert as any).insertId));\n`
);

// 22. updateClassroomVideo — UPDATE returning
content = content.replace(
  `    const [video] = await db.update(classroomVideos).set(data).where(eq(classroomVideos.id, id)).returning();\n`,
  `    await db.update(classroomVideos).set(data).where(eq(classroomVideos.id, id));\n    const [video] = await db.select().from(classroomVideos).where(eq(classroomVideos.id, id));\n`
);

// 23. deleteClassroomVideo — DELETE returning
content = content.replace(
  `    const result = await db.delete(classroomVideos).where(eq(classroomVideos.id, id)).returning();\n`,
  `    const deleteResult = await db.delete(classroomVideos).where(eq(classroomVideos.id, id));\n    const result = (deleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];\n`
);

// 24. createClassroomCompletion
content = content.replace(
  `    const [completion] = await db.insert(classroomCompletions).values(data).returning();\n`,
  `    const [ccInsert] = await db.insert(classroomCompletions).values(data);\n    const [completion] = await db.select().from(classroomCompletions).where(eq(classroomCompletions.id, (ccInsert as any).insertId));\n`
);

// 25. createBadge
content = content.replace(
  `    const [badge] = await db.insert(badges).values(data).returning();\n`,
  `    const [badgeInsert] = await db.insert(badges).values(data);\n    const [badge] = await db.select().from(badges).where(eq(badges.id, (badgeInsert as any).insertId));\n`
);

// 26. updateBadge
content = content.replace(
  `    const [badge] = await db.update(badges).set(data).where(eq(badges.id, id)).returning();\n`,
  `    await db.update(badges).set(data).where(eq(badges.id, id));\n    const [badge] = await db.select().from(badges).where(eq(badges.id, id));\n`
);

// 27. deleteBadge
content = content.replace(
  `    const result = await db.delete(badges).where(eq(badges.id, id)).returning();\n`,
  `    const badgeDeleteResult = await db.delete(badges).where(eq(badges.id, id));\n    const result = (badgeDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];\n`
);

// 28. awardBadge (userBadges insert returning)
content = content.replace(
  /\.insert\(userBadges\)[\s\S]*?\.returning\(\);\s*\n/,
  `.insert(userBadges)\n        .values({ userId, badgeId, awardedAt: new Date() });\n`
);

// 29. createReferralTier
content = content.replace(
  `    const [tier] = await db.insert(referralTiers).values(data).returning();\n`,
  `    const [rtInsert] = await db.insert(referralTiers).values(data);\n    const [tier] = await db.select().from(referralTiers).where(eq(referralTiers.id, (rtInsert as any).insertId));\n`
);

// 30. updateReferralTier
content = content.replace(
  `    const [tier] = await db.update(referralTiers).set(data).where(eq(referralTiers.id, id)).returning();\n`,
  `    await db.update(referralTiers).set(data).where(eq(referralTiers.id, id));\n    const [tier] = await db.select().from(referralTiers).where(eq(referralTiers.id, id));\n`
);

// 31. deleteReferralTier
content = content.replace(
  `    const result = await db.delete(referralTiers).where(eq(referralTiers.id, id)).returning();\n`,
  `    const rtDeleteResult = await db.delete(referralTiers).where(eq(referralTiers.id, id));\n    const result = (rtDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];\n`
);

// 32. createPointListing
content = content.replace(
  `    const [listing] = await db.insert(pointListings).values(data).returning();\n`,
  `    const [plInsert] = await db.insert(pointListings).values(data);\n    const [listing] = await db.select().from(pointListings).where(eq(pointListings.id, (plInsert as any).insertId));\n`
);

// 33. updatePointListing
content = content.replace(
  `    const [listing] = await db.update(pointListings).set(data).where(eq(pointListings.id, id)).returning();\n`,
  `    await db.update(pointListings).set(data).where(eq(pointListings.id, id));\n    const [listing] = await db.select().from(pointListings).where(eq(pointListings.id, id));\n`
);

// 34. deletePointListing
content = content.replace(
  `    const result = await db.delete(pointListings).where(eq(pointListings.id, id)).returning();\n`,
  `    const plDeleteResult = await db.delete(pointListings).where(eq(pointListings.id, id));\n    const result = (plDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];\n`
);

// 35. buyListing (pointListings update returning)
content = content.replace(
  /\.update\(pointListings\)[\s\S]*?\.returning\(\);\s*\n/,
  `.update(pointListings)\n        .set({ status: \"sold\", soldAt: new Date(), soldToUserId: buyerId })\n        .where(eq(pointListings.id, listingId));\n`
);

// 36. createListingComment
content = content.replace(
  `    const [comment] = await db.insert(listingComments).values(data).returning();\n`,
  `    const [lcInsert] = await db.insert(listingComments).values(data);\n    const [comment] = await db.select().from(listingComments).where(eq(listingComments.id, (lcInsert as any).insertId));\n`
);

// 37. deleteListingComment
content = content.replace(
  `    const result = await db.delete(listingComments).where(eq(listingComments.id, id)).returning();\n`,
  `    const lcDeleteResult = await db.delete(listingComments).where(eq(listingComments.id, id));\n    const result = (lcDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];\n`
);

// 38. createShortenedUrl
content = content.replace(
  `    const [row] = await db.insert(shortenedUrls).values({ shortCode, originalUrl }).returning();\n`,
  `    const [suInsert] = await db.insert(shortenedUrls).values({ shortCode, originalUrl });\n    const [row] = await db.select().from(shortenedUrls).where(eq(shortenedUrls.id, (suInsert as any).insertId));\n`
);

// 39. createAdPlacement
content = content.replace(
  `    const [row] = await db.insert(adPlacements).values(data).returning();\n`,
  `    const [apInsert] = await db.insert(adPlacements).values(data);\n    const [row] = await db.select().from(adPlacements).where(eq(adPlacements.id, (apInsert as any).insertId));\n`
);

// 40. updateAdPlacement
content = content.replace(
  `    const [row] = await db.update(adPlacements).set(data).where(eq(adPlacements.id, id)).returning();\n`,
  `    await db.update(adPlacements).set(data).where(eq(adPlacements.id, id));\n    const [row] = await db.select().from(adPlacements).where(eq(adPlacements.id, id));\n`
);

// 41. deleteAdPlacement
content = content.replace(
  `    const result = await db.delete(adPlacements).where(eq(adPlacements.id, id)).returning();\n`,
  `    const apDeleteResult = await db.delete(adPlacements).where(eq(adPlacements.id, id));\n    const result = (apDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];\n`
);

// 42. createProfileLink
content = content.replace(
  `    const [link] = await db.insert(profileLinks).values({ ...data, userId }).returning();\n`,
  `    const [plinkInsert] = await db.insert(profileLinks).values({ ...data, userId });\n    const [link] = await db.select().from(profileLinks).where(eq(profileLinks.id, (plinkInsert as any).insertId));\n`
);

// 43. updateProfileLink
content = content.replace(
  `    const [link] = await db.update(profileLinks).set(data).where(and(eq(profileLinks.id, id), eq(profileLinks.userId, userId))).returning();\n`,
  `    await db.update(profileLinks).set(data).where(and(eq(profileLinks.id, id), eq(profileLinks.userId, userId)));\n    const [link] = await db.select().from(profileLinks).where(eq(profileLinks.id, id));\n`
);

// 44. deleteProfileLink
content = content.replace(
  `    const result = await db.delete(profileLinks).where(and(eq(profileLinks.id, id), eq(profileLinks.userId, userId))).returning();\n`,
  `    const plinkDeleteResult = await db.delete(profileLinks).where(and(eq(profileLinks.id, id), eq(profileLinks.userId, userId)));\n    const result = (plinkDeleteResult as any)[0]?.affectedRows > 0 ? [{ id }] : [];\n`
);

// ─── Final check ─────────────────────────────────────────────────────────
console.log('After:', countOf(content, '.returning()'), '.returning() calls remaining');

fs.writeFileSync('server/storage.db.ts', content);
console.log('✅ storage.db.ts rewritten successfully');
