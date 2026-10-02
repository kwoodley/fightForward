// Fight Forward Academy curriculum.
// Month -> weekly session -> 6 modules (2 video scenarios, 2 games, 2 text scenarios).
// To add a week, fill in that week's `modules` array. Weeks with no modules show as "Coming soon".
//
// Module shapes:
//   video     { type:"video", scene:{ setting, cast, beats }, choices:[A,B,C] }   (optional videoSrc: "path.mp4" plays a real video instead)
//   scenario  { type:"scenario", setup, choices:[A,B,C] }
//   game      { type:"game", kind:"sort", buckets, cards }  or  { kind:"spot", prompt, items }
// A choice is { text, move, rating: "best" | "ok" | "rough", why }. The coach explains every choice at the end.
(function () {
  const MOVES = {
    react:  { label: "React",            note: "Going with the first impulse, or going along with it." },
    step:   { label: "Step back",        note: "Removing yourself from the situation." },
    speak:  { label: "Speak up",         note: "Saying what you think, directly and calmly." },
    corner: { label: "Call your corner", note: "Bringing in someone you trust." }
  };
  const PRESSURE = {
    peer:      "Peer pressure",
    heat:      "Heat of the moment",
    clock:     "Clock is ticking",
    authority: "Adult in charge",
    online:    "Online"
  };
  const SUPPORT = {
    alone:  "On your own",
    crowd:  "People watching",
    peers:  "Friends nearby",
    adult:  "Adult a call away"
  };

  // Cast helpers (look of each character in the animated scenes)
  const coach = { id: "coach", name: "Coach", skin: "#8d5524", shirt: "#16161a", hair: "cap", cap: "#d92b2f", whistle: true };
  const you   = { id: "you",   name: "You",   skin: "#e0ac69", shirt: "#d92b2f", hair: "short", hairColor: "#2b1b12" };

  const MONTHS = [
    {
      id: "jan", name: "January", topic: "Communication",
      blurb: "Say what you mean, listen well, and keep your cool when things get tense.",
      weeks: [
        {
          n: 1, title: "Say it so they hear it",
          modules: [
            {
              id: "jan-w1-video-practice", type: "video", title: "Called Out at Practice",
              teaser: "Coach blames you in front of the whole team for something that wasn’t your fault.",
              pressure: "authority", support: "peers",
              scene: {
                setting: "field", place: "Practice field",
                cast: [
                  { id: "marcus", name: "Marcus", skin: "#c68642", shirt: "#2f6fd6", hair: "short", hairColor: "#111" },
                  coach,
                  you
                ],
                beats: [
                  { narr: "Practice. Last play of the drill." },
                  { who: "coach", say: "That’s on you! Take a lap!", mood: "angry" },
                  { who: "marcus", say: "Whoa… that wasn’t even you.", mood: "shock" },
                  { who: "you", say: "(That wasn’t my fault. My face is burning and everybody’s looking at me.)", mood: "angry" },
                  { narr: "What do you do?" }
                ]
              },
              choices: [
                { text: "Argue back, loud, right there in front of the team.", move: "react", rating: "rough",
                  why: "Yelling back turns it into a fight, and then nobody hears your side. Even if you’re right, Coach only hears disrespect." },
                { text: "Take the lap. After practice, ask Coach for a minute and calmly explain what happened.", move: "speak", rating: "best",
                  why: "Waiting until you’ve cooled off and asking for a private minute gives Coach a real chance to listen. Calm words get heard." },
                { text: "Take the lap and say nothing. Stay mad for the rest of practice.", move: "step", rating: "ok",
                  why: "Not blowing up is smart. But if you never say anything, Coach never finds out the truth, and the anger stays stuck inside you." }
              ]
            },
            {
              id: "jan-w1-game-tone", type: "game", kind: "sort", title: "Tone Check",
              teaser: "Sort each message: calm and clear, heated, or shutting down?",
              intro: "Read each message and decide how it sounds. How you say something matters as much as what you say.",
              buckets: [
                { key: "calm", label: "Calm & clear" },
                { key: "heated", label: "Heated" },
                { key: "shut", label: "Shutting down" }
              ],
              cards: [
                { text: "“I felt left out when the plans changed. Can we talk about it?”", answer: "calm",
                  why: "Says how you feel without blaming anyone, and asks to talk. That’s a strong way to start." },
                { text: "“You ALWAYS ruin everything!”", answer: "heated",
                  why: "Words like “always” and yelling in capitals attack the person. They’ll defend themselves instead of listening." },
                { text: "“Whatever. I don’t care.”", answer: "shut",
                  why: "This shuts the door on the conversation. Often it really means “I do care, and I’m hurt.”" },
                { text: "“Can I have a minute? I want to think before I answer.”", answer: "calm",
                  why: "Taking a pause to cool down is a power move, not a weak one. You told them what you need." },
                { text: "“Nobody asked you.”", answer: "heated",
                  why: "A sharp comeback that’s meant to sting. It makes the other person angrier." },
                { text: "Turns away, crosses arms, and says nothing at all.", answer: "shut",
                  why: "Silence and a turned back send a message too: “I’m done.” The problem stays unsolved." },
                { text: "“I disagree, but I hear your point.”", answer: "calm",
                  why: "You can disagree and still be respectful. This shows you listened first." },
                { text: "“Shut up, you’re so annoying!”", answer: "heated",
                  why: "Name-calling and “shut up” end conversations and hurt feelings." }
              ]
            },
            {
              id: "jan-w1-scenario-project", type: "scenario", title: "The Group Project",
              teaser: "Your partner hasn’t done any of the work. It’s Wednesday and it’s due Friday.",
              pressure: "clock", support: "peers",
              setup: "Your science project is due Friday. Your partner, Alex, hasn’t done any of the work and keeps saying, “I’ll do it later.” It’s Wednesday.",
              choices: [
                { text: "Do all of it yourself so it gets done.", move: "step", rating: "ok",
                  why: "You’ll get it finished, but you’ll end up tired and upset, and Alex learns that someone else will always cover. It’s not fair to you." },
                { text: "Complain about Alex to everyone else in class.", move: "react", rating: "rough",
                  why: "Talking about Alex behind their back doesn’t fix the project. It starts drama, and Alex will probably hear about it." },
                { text: "Talk to Alex: “I’m stressed because it’s due Friday. Can you do the slides while I do the poster?”", move: "speak", rating: "best",
                  why: "You said how you feel, said what you need, and gave a clear plan. If Alex still doesn’t help, then it’s time to tell your teacher." }
              ]
            },
            {
              id: "jan-w1-video-left-on-read", type: "video", title: "Left on Read",
              teaser: "You sent your friend a text. He saw it and never answered. Then you see him laughing with other kids.",
              pressure: "heat", support: "alone",
              scene: {
                setting: "phone", place: "Your phone",
                cast: [
                  you,
                  { id: "dre", name: "Dre", skin: "#8d5524", shirt: "#2f9e5a", hair: "short", hairColor: "#111" },
                  { id: "kai", name: "Kai", skin: "#f1c27d", shirt: "#7a4ab5", hair: "long", hairColor: "#5a3a1a" }
                ],
                beats: [
                  { msg: "Hey! Are you coming to my game Saturday?", from: "you" },
                  { msg: "Seen 3:42 pm", from: "sys" },
                  { narr: "The next morning, in the hallway." },
                  { set: "hallway", place: "School hallway" },
                  { who: "dre", say: "Ha! No way! Tell me everything!", mood: "happy" },
                  { who: "you", say: "(He saw my text. He never answered. And now he’s laughing with them.)", mood: "sad" },
                  { narr: "What do you do?" }
                ]
              },
              choices: [
                { text: "Message him privately: “Hey, I sent you a text and didn’t hear back. Is everything okay?”", move: "speak", rating: "best",
                  why: "You asked instead of guessing. He may have just forgotten or had a rough day. Asking calmly, in private, keeps the friendship safe." },
                { text: "Act like it doesn’t bother you and don’t say anything.", move: "step", rating: "ok",
                  why: "You avoided a fight, but the hurt feeling doesn’t go away. When you never say it, you might start treating him differently without him knowing why." },
                { text: "Tell your other friends that he’s being fake.", move: "react", rating: "rough",
                  why: "You’re guessing why he didn’t answer, and now it’s turned into gossip. Gossip grows fast and he never got a chance to explain." }
              ]
            },
            {
              id: "jan-w1-game-listening", type: "game", kind: "spot", title: "Listening Check",
              teaser: "Spot who is NOT really listening.",
              intro: "A friend is telling you about a bad day. Some of these moves show real listening. Some don’t.",
              prompt: "Tap every move that shows someone is NOT really listening. Then check your answers.",
              items: [
                { text: "Looks at their phone while the friend talks.", hit: true,
                  why: "Phones pull your eyes and brain away. The friend can tell they’re not important right now." },
                { text: "Says, “That sounds like it really bothered you.”", hit: false,
                  why: "This shows you heard the feeling behind the words. That’s real listening." },
                { text: "Interrupts to tell their own story.", hit: true,
                  why: "Right now it’s the other person’s turn. Jumping in makes it about you." },
                { text: "Asks, “What happened next?”", hit: false,
                  why: "A good question shows you’re curious and following along." },
                { text: "Rolls eyes and sighs.", hit: true,
                  why: "Body language talks. Eye-rolls say “this is boring,” even if you don’t say it." },
                { text: "Looks at the person and nods.", hit: false,
                  why: "Eye contact and nodding say “I’m with you.”" },
                { text: "Finishes their sentences, and gets them wrong.", hit: true,
                  why: "Guessing what someone will say is not the same as hearing it. Let them finish." },
                { text: "Repeats back: “So you’re saying you felt left out?”", hit: false,
                  why: "Checking that you got it right is one of the best listening skills there is." }
              ]
            },
            {
              id: "jan-w1-scenario-copy", type: "scenario", title: "Can I Copy?",
              teaser: "Your friend asks for your math homework. The bell is about to ring.",
              pressure: "peer", support: "peers",
              setup: "Your friend Sam walks up: “Can I copy your math homework before class? Please, I’ll owe you one.” The bell rings in two minutes.",
              choices: [
                { text: "Hand it over. He’s your friend.", move: "react", rating: "rough",
                  why: "It feels nice in the moment, but copying can get you both in trouble, and Sam doesn’t learn the math. Real friends help, not just hand over answers." },
                { text: "Say: “I can’t give you my answers, but I’ll help you with the one you’re stuck on.”", move: "speak", rating: "best",
                  why: "You said no clearly and kindly, and offered something real. That’s how you say no without losing a friend." },
                { text: "Pretend you didn’t hear him and walk away.", move: "step", rating: "ok",
                  why: "Avoiding the question gets you out of it, but Sam is left confused and may feel ignored. A short, honest “no” is better." }
              ]
            }
          ]
        },
        { n: 2, title: "Coming soon", modules: [] },
        { n: 3, title: "Coming soon", modules: [] },
        { n: 4, title: "Coming soon", modules: [] }
      ]
    },
    {
      id: "feb", name: "February", topic: "Bullying",
      blurb: "Know what bullying looks like, stand up safely, and know who to tell.",
      weeks: [
        {
          n: 1, title: "Be an upstander",
          modules: [
            {
              id: "feb-w1-video-chat", type: "video", title: "The Group Chat",
              teaser: "The chat is making fun of a kid in your class, and now they’re waiting on you.",
              pressure: "peer", support: "alone",
              scene: {
                setting: "phone", place: "Group chat",
                cast: [],
                beats: [
                  { msg: "The chat is making fun of Eli, a kid in your class.", from: "sys" },
                  { msg: "lol look at his old pics 😂", from: "Tyler" },
                  { msg: "his shoes tho 💀", from: "Jaden" },
                  { msg: "somebody screenshot this", from: "Tyler" },
                  { msg: "@You you’re quiet tonight 👀", from: "Tyler" },
                  { narr: "It’s 11 pm. Everybody is waiting on you." }
                ]
              },
              choices: [
                { text: "Mute the chat and say nothing.", move: "step", rating: "ok",
                  why: "You didn’t join in, which counts. But Eli is still getting picked on, and nobody pushed back." },
                { text: "Post a joke so they leave you alone.", move: "react", rating: "rough",
                  why: "A joke in writing can be screenshotted and shared. You become part of the bullying, and Eli may see it." },
                { text: "Type “Not cool. Leave him alone,” and save screenshots to show a trusted adult.", move: "speak", rating: "best",
                  why: "You stood up in a calm way, and you saved proof. Telling an adult gets real help for Eli, and others in the chat may feel braver once someone speaks first." }
              ]
            },
            {
              id: "feb-w1-game-joke", type: "game", kind: "sort", title: "Joke or Not?",
              teaser: "Sort each situation: friendly joke, mean, or bullying?",
              intro: "Bullying is when someone hurts or targets a person on purpose, over and over, and it’s hard for that person to make it stop. Sort each one.",
              buckets: [
                { key: "friendly", label: "Friendly joke" },
                { key: "mean", label: "Mean, one time" },
                { key: "bully", label: "Bullying" }
              ],
              cards: [
                { text: "Two best friends tease each other about a silly mistake they both made. Both are laughing.", answer: "friendly",
                  why: "Everybody is in on it and enjoying it. If someone stopped laughing, the joke should stop too." },
                { text: "A kid calls another kid “trash” every day, even after he says “stop.”", answer: "bully",
                  why: "It’s on purpose, it keeps happening, and it won’t stop when he asks. That’s bullying." },
                { text: "A classmate says something rude about your shoes. You say “not cool,” and they say “my bad.”", answer: "mean",
                  why: "It was unkind, but it happened once and they backed off. It’s still worth calling out, but it’s not bullying." },
                { text: "A group edits a photo of a classmate to look silly and posts it.", answer: "bully",
                  why: "A group is targeting one person in public to embarrass them. Online bullying counts, too." },
                { text: "A friend cracks a joke about himself and everyone laughs with him.", answer: "friendly",
                  why: "He chose to joke about himself and is having fun. Nobody’s getting hurt." },
                { text: "Someone blocks a kid in the hallway every day so he’s late for class.", answer: "bully",
                  why: "It’s repeated, it’s on purpose, and the kid can’t make it stop. That’s bullying." },
                { text: "In the middle of an argument, someone says, “You’re so annoying.”", answer: "mean",
                  why: "It was said in the heat of an argument. It hurts and it’s not okay, but it’s one moment, not a pattern." },
                { text: "A group tells a kid he can’t sit with them, every single day.", answer: "bully",
                  why: "Leaving someone out on purpose, over and over, is bullying too. It doesn’t have to be loud or physical." }
              ]
            },
            {
              id: "feb-w1-scenario-lunch", type: "scenario", title: "The Lunch Table",
              teaser: "A new kid is looking for a seat. Someone at your table says, “Don’t let him sit here.”",
              pressure: "peer", support: "peers",
              setup: "A new kid, Omar, is standing with his tray, looking for a seat. At your table someone says, “Don’t let him sit here. He’s weird.” A couple of people laugh.",
              choices: [
                { text: "Look away so you don’t get involved.", move: "step", rating: "rough",
                  why: "Looking away tells everyone it’s okay, and Omar feels even more alone. Staying quiet helps the bullying keep going." },
                { text: "Wave Omar over: “Hey, there’s room here.”", move: "speak", rating: "best",
                  why: "One kind move changes the whole moment. It’s simple, it’s safe, and the table has to decide whether to be mean to your face." },
                { text: "Whisper to a friend, “That’s kind of mean,” but don’t say anything out loud.", move: "step", rating: "ok",
                  why: "You know it’s wrong, and that’s a start. But Omar can’t hear a whisper. Next time, say it so he can." }
              ]
            },
            {
              id: "feb-w1-video-hallway", type: "video", title: "Bumped in the Hallway",
              teaser: "Someone slams into your shoulder and everyone turns to see what you’ll do.",
              pressure: "heat", support: "crowd",
              scene: {
                setting: "hallway", place: "School hallway",
                cast: [
                  you,
                  { id: "mia", name: "Mia", skin: "#f1c27d", shirt: "#e0a526", hair: "long", hairColor: "#2b1b12" },
                  { id: "kane", name: "Kane", skin: "#ffdbac", shirt: "#444a57", hair: "short", hairColor: "#6b4a1e" }
                ],
                beats: [
                  { narr: "Between classes." },
                  { who: "kane", say: "Move.", mood: "angry" },
                  { narr: "He slams into your shoulder. Your books hit the floor." },
                  { who: "mia", say: "Are you really going to let him do you like that?", mood: "shock" },
                  { who: "you", say: "(My heart is racing. He’s done this to other kids, too.)", mood: "worried" },
                  { narr: "Everybody is watching. What do you do?" }
                ]
              },
              choices: [
                { text: "Pick up your books, walk away, then tell a teacher or counselor because he does this a lot.", move: "corner", rating: "best",
                  why: "You stayed in control, and you told someone who can stop it. Because it’s a pattern, an adult needs to know. Telling is not snitching. It’s keeping people safe." },
                { text: "Run after him and shove him back.", move: "react", rating: "rough",
                  why: "A fight gets you in trouble, and the video will be online by lunch. Shoving back is exactly what he wants." },
                { text: "Pick up your books and keep walking. Say nothing to anyone.", move: "step", rating: "ok",
                  why: "Walking away is safe, and it keeps you out of a fight. But if he keeps doing it to you and others, nothing changes until an adult knows." }
              ]
            },
            {
              id: "feb-w1-game-upstander", type: "game", kind: "spot", title: "Upstander Moves",
              teaser: "Which moves actually help someone being bullied?",
              intro: "An upstander is someone who helps when they see bullying, in a safe way. Which of these are upstander moves?",
              prompt: "Tap every move that HELPS when someone is being bullied. Then check your answers.",
              items: [
                { text: "Tell a trusted adult.", hit: true,
                  why: "Adults have the power to make it stop. Telling is not snitching." },
                { text: "Laugh along so you don’t get picked on next.", hit: false,
                  why: "Laughing tells the bully it’s working, and it hurts the target even more." },
                { text: "Sit with the person who’s being left out.", hit: true,
                  why: "Showing you’re on their side helps them feel less alone." },
                { text: "Film it so you can post it later.", hit: false,
                  why: "Posting it makes the embarrassment bigger. If you need proof, give it to an adult, not the internet." },
                { text: "Say “That’s not cool” calmly, if you feel safe.", hit: true,
                  why: "When one person speaks up, others often join. Only do this if you feel safe." },
                { text: "Join in just once, so it’s not a big deal.", hit: false,
                  why: "Once is still joining. It makes it easier for the bullying to keep going." },
                { text: "Check on them later: “Hey, you okay?”", hit: true,
                  why: "A kind private message can mean everything to someone who’s hurting." },
                { text: "Spread the rumor “just to see what happens.”", hit: false,
                  why: "Rumors spread fast and can really hurt someone. Don’t pass them along." },
                { text: "Save screenshots as proof to show an adult.", hit: true,
                  why: "Proof helps adults take action, especially with online bullying." }
              ]
            },
            {
              id: "feb-w1-scenario-video", type: "scenario", title: "The Video",
              teaser: "A video of a classmate tripping is going around. Someone sends it to you.",
              pressure: "online", support: "adult",
              setup: "A video is going around of a classmate, Priya, tripping and dropping her lunch tray. It has laughing emojis and 400 views. Someone sends it to you with the message, “LOL watch this.”",
              choices: [
                { text: "Share it. It’s funny and everyone else is.", move: "react", rating: "rough",
                  why: "Each share makes the embarrassment bigger for Priya. Once it’s online, you can’t take it back." },
                { text: "Watch it, but don’t share it.", move: "step", rating: "ok",
                  why: "Not sharing is better than sharing, but the video keeps spreading and Priya still has no help." },
                { text: "Don’t share it. Tell a trusted adult, and if you feel okay, check on Priya.", move: "corner", rating: "best",
                  why: "You stopped it from spreading, and you got help. A message from you may be the nicest thing Priya sees all week." }
              ]
            }
          ]
        },
        { n: 2, title: "Coming soon", modules: [] },
        { n: 3, title: "Coming soon", modules: [] },
        { n: 4, title: "Coming soon", modules: [] }
      ]
    }
  ];

  window.FF_CONTENT = { MONTHS, MOVES, PRESSURE, SUPPORT };
})();
