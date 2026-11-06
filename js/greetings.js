'use strict';
// ---------- Greetings ----------
// {name} is replaced with your name, or dropped cleanly when your name is switched off.
const GREETINGS = {
  plain: {
    label: 'Polite',
    morning: ['Good morning, {name}.'],
    afternoon: ['Good afternoon, {name}.'],
    evening: ['Good evening, {name}.'],
    night: ['Up late, {name}.']
  },
  dry: {
    label: 'Dry',
    morning: ['Good morning, {name}. Allegedly.', 'Morning, {name}. The bar is on the floor. Step over it.', 'Oh good, you’re up, {name}. Nobody was asking.', 'It’s morning, {name}. We all have to live with that.', 'Rise and shine, {name}. Or just rise. Let’s be realistic.', 'Another morning, {name}. They keep making those.'],
    afternoon: ['Afternoon, {name}. Half the day is gone and so is your potential.', 'Good afternoon, {name}. Still here, I see.', 'It’s the afternoon, {name}. You’ve peaked.', 'Afternoon, {name}. That coffee isn’t going to fix it.', 'Hello, {name}. Your lunch break was a lie.'],
    evening: ['Good evening, {name}. You survived, technically.', 'Evening, {name}. Nothing got better, but it did get darker.', 'Evening, {name}. The day’s over. No one’s grading it. Yet.', 'You made it to evening, {name}. Don’t let it go to your head.'],
    night: ['Up late, {name}. Bad decisions love company.', 'Still awake, {name}? Bold plan for tomorrow.', 'It’s late, {name}. Nothing good is on this page.']
  },
  dark: {
    label: 'Dark',
    morning: ['Good morning, {name}. One day closer.', 'Morning, {name}. Everything you love is temporary. Coffee’s ready.', 'Wake up, {name}. The worms can wait.', 'Good morning, {name}. Death sends its regards and says no rush.', 'Morning, {name}. The sun came back. It hasn’t forgiven anyone.'],
    afternoon: ['Afternoon, {name}. Entropy is ahead of schedule.', 'Good afternoon, {name}. That’s another half a day of the only life you get.', 'Afternoon, {name}. Everything you’ve ever packaged will outlive you.', 'Hello, {name}. The universe is still indifferent. Carry on.'],
    evening: ['Good evening, {name}. The shadows are getting ideas.', 'Evening, {name}. Another day the void didn’t return your call.', 'Evening, {name}. Lock the door. It won’t help, but it’s a nice ritual.'],
    night: ['Up late, {name}. So is whatever’s in the hallway.', 'The void’s open 24 hours, {name}.', 'Go to bed, {name}. It’ll still be meaningless tomorrow.']
  },
  foul: {
    label: 'Foul-mouthed',
    morning: ['Good morning, {name}, you fuck wad. Don’t fuck today.', 'Get up, {name}. Shit’s not going to ruin itself.', 'Morning, {name}. Try not to be a dipshit before lunch.', 'Rise and grind, {name}, you magnificent bastard.', 'Morning, asshole. Yes, you, {name}.'],
    afternoon: ['Afternoon, {name}. How’s the shitshow?', 'Still not done, {name}? Fucking incredible.', 'It’s the afternoon, {name}, and you’ve accomplished jack shit. Keep it up.', 'Hey, {name}. Half the day’s fucked already. Finish strong.'],
    evening: ['Evening, {name}. Fuck today, honestly.', 'You made it, {name}, you stubborn son of a bitch.', 'Evening, {name}. Put the day down and walk away, you beautiful disaster.'],
    night: ['Go to bed, {name}, you absolute goblin.', 'Why the fuck are you still up, {name}?', 'It’s late, {name}. Nothing you do now will be smart.']
  },
  horror: {
    label: 'Horror',
    morning: ['The sun has risen again, {name}. Its reasons remain its own.', 'Rise, {name}. The ash won’t sweep itself.', 'It watched you sleep, {name}. It says good morning.'],
    afternoon: ['The light is already leaving, {name}.', 'Afternoon, {name}. Something in the walls knows your schedule.', 'Do not look behind the door today, {name}.'],
    evening: ['Dusk, {name}. Bar the door.', 'The candles are lit, {name}. Don’t count them.', 'They’re awake now, {name}. Be polite.'],
    night: ['It is the hour of things with too many teeth, {name}.', 'You’re not the only one awake, {name}.', 'Don’t answer it, {name}.']
  }
};
const PERIOD_LABEL = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Late night' };
const dayPeriod = (h) => (h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night');

function greetingLines(period) {
  if (settings.greetStyle === 'custom') {
    const mine = (settings.greetCustom?.[period] || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (mine.length) return mine;
    return GREETINGS.plain[period];
  }
  return (GREETINGS[settings.greetStyle] || GREETINGS.dark)[period];
}
// Fill in the name, or remove it along with the comma or space it leaned on
function fillGreeting(line) {
  const name = settings.name.trim();
  if (settings.greetName && name) return line.replace(/\{name\}/g, name);
  const out = line.replace(/,\s*\{name\}/g, '').replace(/\{name\},?\s*/g, '').replace(/\s+([.?!,])/g, '$1').trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}
const dayStamp = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
function pickIndex(n, seed) {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % n;
}
const greetState = { key: '', line: '', nudge: Math.floor(Math.random() * 1000) };
function greetingText(now = new Date()) {
  const period = dayPeriod(now.getHours());
  const rotate = settings.greetRotate;
  const stamp = rotate === 'day' ? dayStamp(now) : rotate === 'hour' ? `${dayStamp(now)}-${now.getHours()}` : '';
  const key = [period, stamp, settings.greetStyle, settings.greetName, settings.name, greetState.nudge, JSON.stringify(settings.greetCustom)].join('|');
  if (key !== greetState.key) {
    const lines = greetingLines(period);
    // A new tab gets a surprise; hourly and daily stay put until the clock moves on
    greetState.line = fillGreeting(lines[pickIndex(lines.length, `${stamp}${period}${greetState.nudge}`)]);
    greetState.key = key;
  }
  return greetState.line;
}
function nextGreeting() {
  const before = greetState.line;
  for (let i = 0; i < 8 && greetState.line === before; i++) { greetState.nudge += 1 + i; greetingText(); }
  setAll('greet', greetState.line);
  if ($('greetPreview')) $('greetPreview').textContent = greetState.line;
}

// Settings
function syncGreetingForm() {
  $('greetStyle').value = settings.greetStyle;
  $('greetName').checked = settings.greetName;
  $('greetRotate').value = settings.greetRotate;
  $('greetCustomBox').hidden = settings.greetStyle !== 'custom';
  for (const p of Object.keys(PERIOD_LABEL)) {
    const box = $('greet-' + p);
    if (document.activeElement !== box) box.value = settings.greetCustom?.[p] || '';
    box.placeholder = GREETINGS.dark[p].slice(0, 2).join('\n');
  }
  $('greetPreview').textContent = greetingText();
}
function greetChanged() { saveSettings(); syncGreetingForm(); setAll('greet', greetingText()); }
$('greetStyle').innerHTML = Object.entries(GREETINGS).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join('') + '<option value="custom">My own</option>';
$('greetStyle').addEventListener('change', (e) => { settings.greetStyle = e.target.value; greetChanged(); });
$('greetName').addEventListener('change', (e) => { settings.greetName = e.target.checked; greetChanged(); });
$('greetRotate').addEventListener('change', (e) => { settings.greetRotate = e.target.value; greetChanged(); });
$('greetAnother').addEventListener('click', nextGreeting);
for (const p of Object.keys(PERIOD_LABEL)) {
  $('greet-' + p).addEventListener('input', (e) => {
    settings.greetCustom = { ...(settings.greetCustom || {}), [p]: e.target.value };
    greetChanged();
  });
}
