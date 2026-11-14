Volunteer screen redesign: turn it from a one-button form into the volunteer's host for the whole shift. Keep the current look from #6 (lime, black, Inter Tight, 12px gaps, no borders or shadows). Keep everything that works now: talk button, Type instead, hours count, thank-you, Bright Futures picker, hotline footer, voice toggle, EN/ES. Don't rename existing element ids. All new text in English and Spanish. Fix #7 first if it isn't fixed.

## The idea
Right now the volunteer gets a name box and a mic. They don't know what today is, who's in charge, what to do when they're idle, or where to go when something's wrong. Fix it with four tabs on one screen, phone first.

## Layout (phone, 390px wide)
Top: **Today card** (always visible, collapsible after check-in).
Under it: a big **"I'm here"** button before check-in. After check-in it becomes a live **shift clock** ("On shift 1h 12m") and the talk button.
Bottom: floating black pill nav with 4 tabs, icon + word: **Shift** (default), **Tasks**, **Ask**, **Report**. On desktop the same 4 sit in the left black sidebar.

## 1. Today card (event overview)
Staff fill it in on the staff page; the volunteer sees it. Fields:
- Event name and place: "Riverside Pantry · Saturday Food Drive"
- Time: "9:00 AM to 12:00 PM" plus a live status pill: "Starts in 20 min" / "Happening now" / "Wrapping up" (last 30 min)
- Your host: name + "Find her at the front table"
- Today's goal, one line: "Pack 300 boxes for 300 families"
- Live progress toward the goal: a lime pill bar, "182 of 300 boxes", updated by staff
- Know before you go, 3 to 5 short lines: parking, what to wear, where bags go, bathrooms, water and breaks
Seed one demo event with these values so the screen is never empty.

## 2. Check-in and shift clock
"I'm here" logs a check-in time and shows "Checked in 9:04 AM". The shift clock runs until they tell Tally they're done (talk or type). Hours default to the clock time; what they say can correct it. First-time names get a "First shift" badge on staff page and a line on the volunteer screen: "First time? Your host is Maria. She'll find you."

## 3. Tasks tab (both sides)
**Staff side:** a "Today's tasks" box. Staff add a task: title, where, how many people needed, e.g. "Sort cans · Table 2 · 3 people". They see who's on each task and can mark it done.
**Volunteer side:** list of open tasks as cards with spots left ("2 of 3 spots open") and a "I'll take it" button. Taking a task shows "You're on: Sort cans, Table 2" at the top of the Shift tab with a "Done, give me another" button. Also a big **"I'm free"** button: Tally picks the open task with the most spots left and says it out loud (ElevenLabs if voice on): "Head to table 2. Sort cans with Rosa."
Why: standing around with nothing to do is the most common volunteer complaint.

## 4. Ask tab (AI about the event)
A chat box: "Ask anything about today." Volunteers type or tap the mic. Answers come from the event's Today card, Know before you go, and task list, sent to the AI as context. Short answers, 1 to 2 sentences, in the language they asked in. If the answer isn't in the event info, say "I don't know that one. Ask Maria at the front table." Never invent. Show 3 suggested questions as tap chips: "Where do I park?", "Can I give a client a ride?", "When's my break?". Seed the event notes so the demo answers well. Staff can also add notes like "Don't give clients your phone number or money" so volunteer boundary questions get real answers.

## 5. Report tab (complaints and concerns)
Two clear choices, each a big card:
- **"Something's wrong with someone we're helping"** (a client concern). Goes to the existing concern flow with 3 levels: danger now shows a red "Call 911" button at top of their screen; today goes red on the staff page; FYI goes to the log.
- **"Something happened that wasn't okay"** (a complaint: someone was rude to a client, a volunteer or staff member made them uncomfortable, an injury, a safety problem). Has a toggle: **"Keep my name private"** (on by default). Private reports go to staff marked "Private" with the name removed, in a separate "Reports" section on the staff page, director view.
After either: "Thank you. Staff will see this today." When staff tap Handled, the volunteer's Report tab shows "Staff handled your report."
Hotline footer stays.

## 6. After the shift
Keep the thank-you card. Add: the shift clock time, the task(s) they did, and their part of the goal ("You helped pack 182 boxes today"). Keep "Get my hours letter" and "Save me a spot next time."

## Staff page additions needed for this
- Event editor: the Today card fields + goal progress number
- Today's tasks box (add, see who's on it, mark done)
- Event notes for the Ask AI
- Reports section with Private label and Handled button
- Checked-in now list with the shift clock per person

## Done when
On a phone width: a new volunteer can see what today is, check in, take a task, ask "where do I park?" and get the right answer, file a private complaint, and finish with a thank-you showing hours and their part of the goal. Staff see each of these appear live. Tests pass.

