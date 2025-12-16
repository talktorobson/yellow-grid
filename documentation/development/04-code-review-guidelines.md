# Code Review Guidelines

## Purpose

Defines code review standards, processes, and expectations to maintain high code quality and facilitate knowledge sharing.

## Code Review Goals

1. **Catch bugs** before they reach production
2. **Ensure code quality** and maintainability
3. **Knowledge sharing** across the team
4. **Enforce standards** (architecture, coding, security)
5. **Mentor** junior developers
6. **Document decisions** for future reference

## Review Process

### 1. Author Responsibilities

**Before creating PR**:
- [ ] Code is complete and working
- [ ] All tests pass locally
- [ ] Self-review completed
- [ ] Code follows coding standards
- [ ] Documentation updated
- [ ] No debugging code (console.log, debugger)
- [ ] No TODOs without tickets
- [ ] Commit messages follow conventions

**PR Description**:
```markdown
## Summary
Brief description of changes (1-3 sentences)

Fixes: ABC-123

## Changes
- Added X feature
- Refactored Y component
- Fixed Z bug

## Testing
- Unit tests: 15 new tests added
- Integration tests: Updated assignment flow test
- Manual testing: Verified in local environment

## Screenshots / Demo
[If UI changes]

## Deployment Notes
- [ ] Database migration required
- [ ] New environment variables needed
- [ ] Breaking changes (if any)

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No sensitive data
- [ ] Performance considered
```

### 2. Reviewer Responsibilities

**Timeline**:
- Begin review within **4 hours** of request
- Complete initial review within **24 hours**
- For urgent PRs: within **2 hours**

**Review focus areas**:
1. **Correctness**: Does it work? Edge cases handled?
2. **Design**: Is the approach sound? Scalable?
3. **Readability**: Can others understand it?
4. **Testing**: Adequate test coverage?
5. **Security**: Any vulnerabilities?
6. **Performance**: Any bottlenecks?

## Review Checklist

### Functionality

- [ ] Code does what the ticket describes
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs
- [ ] Business logic is correct

### Code Quality

- [ ] Names are clear and descriptive
- [ ] Functions are single-purpose
- [ ] No code duplication
- [ ] Complexity is manageable (< 10 cyclomatic complexity)
- [ ] No over-engineering
- [ ] SOLID principles followed

### TypeScript / NestJS

- [ ] No `any` types (or properly justified)
- [ ] Explicit return types on functions
- [ ] Proper error handling (try/catch, custom exceptions)
- [ ] DTOs validated with class-validator
- [ ] Dependency injection used correctly
- [ ] Guards/interceptors used appropriately

### Testing

- [ ] Unit tests for new logic
- [ ] Integration tests for new APIs
- [ ] Tests are clear and maintainable
- [ ] Edge cases tested
- [ ] Mocks used appropriately
- [ ] Test coverage > 80%

### Security

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (proper escaping)
- [ ] Authentication/authorization checked
- [ ] Rate limiting considered
- [ ] No sensitive data in logs

### Performance

- [ ] No N+1 queries
- [ ] Indexes present for queries
- [ ] Caching considered where appropriate
- [ ] No unnecessary loops or computations
- [ ] Pagination for large datasets
- [ ] Connection pooling used

### Database

- [ ] Migrations are reversible
- [ ] Migrations tested locally
- [ ] No data loss in migrations
- [ ] Indexes added for new columns queried
- [ ] Foreign keys maintained

### API Design

- [ ] RESTful conventions followed
- [ ] Proper HTTP methods and status codes
- [ ] OpenAPI spec updated
- [ ] Backward compatible (or versioned)
- [ ] Pagination for list endpoints
- [ ] Filtering/sorting supported

### Documentation

- [ ] OpenAPI documentation updated
- [ ] README updated if needed
- [ ] Complex logic has comments
- [ ] Architecture docs updated (if applicable)
- [ ] CHANGELOG.md updated

## Review Comments

### Comment Types

Use prefixes to clarify comment intent:

**[Blocking]**: Must be addressed before merge
```
[Blocking] This will cause a null pointer exception when provider.teams is empty.
We need to add a null check.
```

**[Question]**: Seeking clarification
```
[Question] Why are we using a Set here instead of an Array? Is order not important?
```

**[Suggestion]**: Optional improvement
```
[Suggestion] Consider extracting this into a separate function for better testability.
```

**[Nit]**: Minor style/preference issue
```
[Nit] Typo in variable name: "assignemnt" → "assignment"
```

**[Praise]**: Positive feedback
```
[Praise] Great approach to handling the TV → Installation dependency! This is very clean.
```

### Comment Etiquette

#### ✅ Good Comments

**Constructive**:
```
[Blocking] This query will be slow for large datasets. Consider adding an index
on `scheduled_date` or implementing cursor-based pagination.

Would you like me to point you to our pagination pattern docs?
```

**Specific**:
```
[Suggestion] Lines 45-60 could be extracted into a `calculateTotalScore` method.
This would make it easier to test the scoring logic independently.
```

**Question-based**:
```
[Question] Have you considered what happens if the assignment run fails halfway through?
Should we wrap this in a transaction?
```

**Appreciative**:
```
[Praise] Excellent test coverage! The edge case tests for buffer stacking are
particularly thorough.
```

#### ❌ Bad Comments

**Too vague**:
```
❌ This doesn't look right.
✅ [Blocking] The buffer calculation doesn't account for holidays. Should use
   `skipNonWorkingDays()` helper.
```

**Demanding**:
```
❌ Change this immediately.
✅ [Blocking] We need to validate the email format here to prevent invalid data.
```

**Personal**:
```
❌ You obviously don't understand how this works.
✅ [Question] I'm having trouble following the logic here. Could you add a comment
   explaining the approach?
```

**Nitpicky without value**:
```
❌ [Nit] Use const instead of let on line 45.
✅ (Use automated linter for these)
```

## Approval Guidelines

### When to Approve

✅ **Approve if**:
- All blocking issues resolved
- Code meets quality standards
- Tests are adequate
- No security concerns
- Minor issues can be fixed in follow-up

**Approval comment**:
```
LGTM! 🚀

Great work on the scoring transparency feature. The funnel audit trail will be
very valuable for debugging assignment issues.

Minor suggestions above are optional - feel free to address in a follow-up PR.
```

### When to Request Changes

⚠️ **Request changes if**:
- Bugs present
- Missing tests for critical logic
- Security vulnerabilities
- Performance issues
- Breaks existing functionality
- Doesn't meet requirements

**Request changes comment**:
```
Thanks for the PR! A few blocking issues to address:

1. [Blocking] Null pointer risk on line 123 - see comment
2. [Blocking] Missing integration test for the new assignment flow
3. [Question] Clarification needed on buffer stacking logic

Once these are addressed, I'll be happy to approve!
```

### When to Comment (No Approval Yet)

💬 **Comment if**:
- You're not a required reviewer but have feedback
- You need more context before deciding
- You're asking questions for your own learning

## Special Cases

### Large PRs

If PR has > 500 lines changed:

**Author should**:
- Break into smaller PRs if possible
- Provide extra context in description
- Highlight areas needing special attention

**Reviewer should**:
- Focus on high-level design first
- Request tests be reviewed separately
- Schedule synchronous walkthrough if needed

### Urgent Hotfixes

For production hotfixes:
- Expedited review (within 1 hour)
- Focus on correctness and risk
- Can approve with minor issues
- Document follow-up tasks

### Experimental PRs / Spike Work

For POCs or spikes:
- Review for approach, not polish
- Focus on feasibility and risks
- OK to skip some standards
- Mark clearly as "Spike" in title

## Review Workflow

```
1. PR Created
   ↓
2. CI Runs (lint, test, build)
   ↓
3. Reviewers Assigned (auto via CODEOWNERS)
   ↓
4. Reviewers Review
   ├─→ Approve (go to 7)
   ├─→ Request Changes (go to 5)
   └─→ Comment (go to 4)
   ↓
5. Author Addresses Feedback
   ↓
6. Re-review (go to 4)
   ↓
7. Required Approvals Met (≥2 for critical services)
   ↓
8. Merge (Squash and Merge recommended)
```

## CODEOWNERS

Set up `.github/CODEOWNERS` for automatic reviewer assignment:

```
# Default reviewers
* @tech-lead @senior-engineer-1

# Architecture changes require architect review
/architecture/ @architect @tech-lead

# API changes require API team
/src/modules/*/controllers/ @api-team @tech-lead

# Database migrations require DBA review
**/migrations/ @dba @tech-lead

# Security-sensitive code
/src/modules/auth/ @security-team @tech-lead
/src/common/security/ @security-team

# Infrastructure
/terraform/ @devops-team
/.github/workflows/ @devops-team
/kubernetes/ @devops-team
```

## Review Metrics

Track these to improve review process:

- **Review turnaround time**: Time from PR creation to first review
- **Time to merge**: Total time from creation to merge
- **Review iterations**: Number of review rounds before merge
- **Blocking issues per PR**: Average number of blocking issues found

**Goals**:
- First review < 4 hours
- Time to merge < 24 hours (for normal PRs)
- < 2 review iterations average

## Best Practices

### For Authors

- ✅ Keep PRs small (< 400 lines when possible)
- ✅ One concern per PR
- ✅ Self-review before requesting review
- ✅ Respond to feedback promptly
- ✅ Ask questions if feedback unclear
- ✅ Mark resolved conversations
- ✅ Thank reviewers

### For Reviewers

- ✅ Review within SLA (4 hours / 24 hours)
- ✅ Be kind and constructive
- ✅ Explain reasoning
- ✅ Suggest alternatives, don't just criticize
- ✅ Approve when standards met
- ✅ Don't be pedantic on style (use linters)
- ✅ Provide positive feedback

## Handling Disagreements

If author and reviewer disagree:

1. **Discuss asynchronously** in PR comments first
2. **Escalate to synchronous discussion** (call/meeting)
3. **Involve tech lead** if no consensus
4. **Document decision** in PR for future reference
5. **Create ADR** (Architecture Decision Record) if significant

## Post-Merge

After PR is merged:

- [ ] Delete feature branch
- [ ] Monitor deployment (dev/staging)
- [ ] Verify feature works as expected
- [ ] Update ticket status
- [ ] Close related issues

## Example Review Flow

**Initial Review**:
```
Thanks for the PR! Overall approach looks solid. A few things:

[Blocking] Line 123: Risk of null pointer when `provider.teams` is empty
→ Add null check: `if (!provider.teams?.length) { ... }`

[Question] Line 156: Why are we querying providers twice?
→ Could we combine these queries for better performance?

[Suggestion] Line 200-220: Consider extracting scoring logic to separate service
→ Would make testing easier and improve separation of concerns

[Nit] Line 89: Typo in comment: "assignemnt" → "assignment"

[Praise] Great test coverage! The funnel transparency tests are very thorough.
```

**Follow-up**:
```
Thanks for addressing the feedback!

✅ Null check added - looks good
✅ Combined queries - nice performance improvement
✅ Scoring service extracted - much cleaner!
✅ Typo fixed

LGTM! 🚀 Approving now.
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-14
