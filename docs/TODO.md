## Features
- Add Austin, TX and test the adding cities pipeline

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