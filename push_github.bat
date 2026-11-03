@echo off
echo ========================================================
echo   NexMilestro - Pushing Code to GitHub (nexsolve-tech)
echo ========================================================
echo.
git add -A
git commit -m "feat(v2): restore all 15 modular views, full enterprise forms, attachments, milestones, kanban board, and masters"
git push -u origin main --force
echo.
echo ========================================================
echo   Push complete!
echo ========================================================
pause
