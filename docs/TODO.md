## Features
- ~~Complete other minority groups~~ ✅ DONE - All 5 groups (Hispanic, Black, Asian, Pacific Islander, Native American) fully implemented in UI, scoring, and data
- ~~Pipeline for adding new cities~~ ✅ DONE - See `docs/ADDING-CITIES.md` for comprehensive guide

## Robustness
- Architecture reivew
    - Look for poor architecuture and broken branches from legacy code/designs
- Code review & refactor
    - Look for poor programming patterns
    - Look for places where implemented quick fixes or patches but added technical debt
    - Look for deprecated code and orphaned branches
- Security (future)
    - Consider hiding the data access interface from regular users
    - Security review (attack surface, DOS, data leaks, etc)
- Documentation
    - Architecture documentation with focus on understandability of how everything works
        - Should allow someone to understand how all the different data is pulled, compiled, and integrated into the scoring
        - Should allow developers to easily understand the structure and maintain the code
    - Changelog

## Bugs
- ~~Dashed line (national average) is very faint on the radar plot~~ ✅ FIXED - Increased stroke width to 2, darker color (#888888), better opacity