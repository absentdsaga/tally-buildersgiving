# Tally project rules

Every Mel run in this repo follows these.

- The AI reads and extracts. Plain deterministic code decides whether hours count. A person on staff approves hours before they reach a grant report.
- Never invent hours. Unknown hours = "Needs hours", never 0 counted.
- A volunteer's concern is shown with their exact words and original language; never paraphrased away.
- Every new string exists in English and Spanish.
- Test with real provider calls before calling a change done.
- Never touch port 4517 (the live copy). Test on PORT=4600 with DB_PATH=tmp/live.db and stop it with `kill $(cat tmp/server.pid)`. Never use pkill or killall.
- Never read or print environment or credential files. Do not push or touch git remotes.
