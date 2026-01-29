## Features
- ~~Complete other minority groups~~ ✅ DONE - All 5 groups (Hispanic, Black, Asian, Pacific Islander, Native American) fully implemented in UI, scoring, and data
- ~~Pipeline for adding new cities~~ ✅ DONE - See `docs/ADDING-CITIES.md` for comprehensive guide
- Add Austin, TX and test the adding cities pipeline

### City Tinder
- Fun silly game for users to pretune their app settings. This is an alternative to the quick start.
- The game is similar to the dating app Tinder. When the user starts this, we will launch a UI screen will similar elements to Tinder.
- User will be presented with city profiles. Each city profile contains
    - Picture
    - Brief bio
- User can swipe left (reject), right (like), up (superlike). There are also buttons on the UI for these.
- The cities (let's start with 10) will be selected based on:
    - Representative characteristics of the factors for city perferences. Ideally candidates will be strong in certain categories and candidates will be diverse from each other
    - Certain iconic cities should be included (e.g. NYC, SF)
- After the users complete swiping, their preferences will be updated based on how they responded to the cities.
- Final message should be provided to the user summarizing their preferences (in a short fun way) and remind them to fine tune their settings in the advanced options.

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