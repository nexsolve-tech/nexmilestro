@echo off
echo ========================================================
echo   NexMilestro - Pushing Code to GitHub (nexsolve-tech)
echo ========================================================
echo.
git add -A
git commit -m "feat(v2): complete Field Force architecture rewrite for NexMilestro"
git push -u origin main
echo.
echo ========================================================
echo   Push complete!
echo ========================================================
pause
