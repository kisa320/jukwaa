const CATEGORIES = ["All", "Music", "Comedy", "Fitness"];

const CREATORS = [
  { id: "c1", name: "Wanjiru", age: 24, city: "Nairobi", category: "Music", price: 150, live: true, viewers: 312,
    emoji: "🎤", colors: ["#ff6a88", "#ff99ac"], bio: "Acoustic Benga & Afro-soul covers. Requests open every Friday.",
    trust: 94, rating: 4.9, shows: 86, reports: 0, verified: true, faceHidden: false,
    history: [["Fri Acoustic Night", "3 days ago", 410, 4.9], ["Sauti Sol covers", "1 week ago", 288, 4.8], ["Original songs", "2 weeks ago", 196, 5.0]] },
  { id: "c2", name: "Brian Otieno", age: 29, city: "Kisumu", category: "Comedy", price: 100, live: true, viewers: 1204,
    emoji: "😂", colors: ["#f7971e", "#ffd200"], bio: "Stand-up from the lakeside. Clean jokes, loud laughs.",
    trust: 88, rating: 4.7, shows: 140, reports: 1, verified: true, faceHidden: false,
    history: [["Matatu Diaries", "Yesterday", 1530, 4.8], ["Office Politics", "5 days ago", 980, 4.6], ["Crowd work special", "2 weeks ago", 1102, 4.7]] },
  { id: "c3", name: "Coach Amina", age: 31, city: "Mombasa", category: "Fitness", price: 200, live: false, viewers: 0,
    emoji: "💪", colors: ["#00c6ff", "#0072ff"], bio: "45-minute HIIT and beach-body sessions. No equipment needed.",
    trust: 97, rating: 4.9, shows: 220, reports: 0, verified: true, faceHidden: false,
    history: [["Morning HIIT", "Today 6am", 640, 5.0], ["Core blast", "2 days ago", 512, 4.9], ["Stretch & recover", "4 days ago", 377, 4.8]] },
  { id: "c4", name: "Kamau Kicheko", age: 35, city: "Nakuru", category: "Comedy", price: 120, live: true, viewers: 458,
    emoji: "🤣", colors: ["#f857a6", "#ff5858"], bio: "Sheng skits and roast battles. Send a name, get roasted (nicely).",
    trust: 81, rating: 4.5, shows: 64, reports: 2, verified: true, faceHidden: false,
    history: [["Roast night", "2 days ago", 520, 4.6], ["Sheng skits", "1 week ago", 401, 4.4], ["Fan roast battle", "3 weeks ago", 233, 4.5]] },
  { id: "c5", name: "Shiru Moves", age: 22, city: "Nairobi", category: "Fitness", price: 150, live: true, viewers: 876,
    emoji: "💃", colors: ["#8e2de2", "#4a00e0"], bio: "Dance cardio to Gengetone & Amapiano. Sweat while you learn a routine.",
    trust: 76, rating: 4.3, shows: 38, reports: 3, verified: false, faceHidden: true,
    history: [["Amapiano cardio", "Yesterday", 902, 4.4], ["Gengetone burn", "6 days ago", 650, 4.1], ["Stretch & Q&A", "2 weeks ago", 300, 4.3]] },
  { id: "c6", name: "Kip Runner", age: 30, city: "Eldoret", category: "Fitness", price: 80, live: false, viewers: 0,
    emoji: "🏃", colors: ["#11998e", "#38ef7d"], bio: "Eldoret-style endurance training. Live runs, form tips and Q&A.",
    trust: 99, rating: 5.0, shows: 310, reports: 0, verified: true, faceHidden: false,
    history: [["10K tempo run", "Yesterday", 1340, 5.0], ["Hill sprints", "4 days ago", 870, 4.9], ["Running form clinic", "1 week ago", 722, 5.0]] },
  { id: "c7", name: "QuickCash254", age: 27, city: "Unknown", category: "Comedy", price: 300, live: true, viewers: 41,
    emoji: "🎭", colors: ["#434343", "#000000"], bio: "Comedy giveaway show, winner takes all!!! Pay first, join after.",
    trust: 32, rating: 2.1, shows: 9, reports: 14, verified: false, faceHidden: true,
    history: [["Giveaway (cancelled)", "3 days ago", 60, 1.5], ["Giveaway #2", "1 week ago", 33, 2.0], ["Started 40 min late", "2 weeks ago", 28, 2.8]] },
  { id: "c8", name: "Achieng Sings", age: 25, city: "Nairobi", category: "Music", price: 100, live: true, viewers: 655,
    emoji: "🎶", colors: ["#fc466b", "#3f5efb"], bio: "Ohangla & Lingala vocals. Sunday request marathons.",
    trust: 90, rating: 4.8, shows: 112, reports: 0, verified: true, faceHidden: false,
    history: [["Sunday requests", "4 days ago", 780, 4.9], ["Lingala night", "1 week ago", 540, 4.7], ["Acoustic duets", "2 weeks ago", 430, 4.8]] },
  { id: "c9", name: "DJ Kibe", age: 28, city: "Thika", category: "Music", price: 150, live: false, viewers: 0,
    emoji: "🎧", colors: ["#ee0979", "#ff6a00"], bio: "Weekend mixes: Bongo, Afrobeats, throwbacks. Shout-outs included.",
    trust: 63, rating: 3.9, shows: 25, reports: 4, verified: false, faceHidden: true,
    history: [["Saturday mix", "1 week ago", 210, 4.0], ["Throwback set", "2 weeks ago", 180, 3.6], ["Ended early", "3 weeks ago", 95, 3.2]] },
];

const FAN_NAMES = ["kev_254", "mercy.w", "otis", "njeri_k", "DJ_fan", "baraka", "lucy_m", "tonny", "faith", "sam_ke", "wambui", "eric.o", "zawadi", "moha", "aisha"];
const CHAT_LINES = ["🔥🔥🔥", "Habari kutoka Kisumu!", "This is so good", "Play that one again 🙏", "Shout out to Mombasa!", "First time here, love it", "😂😂😂", "Uko fiti!", "Worth every bob", "Can you do a part 2?", "Sasa!", "Respect 👏"];

const PERKS = {
  Music: [["🎵 Song request", 100], ["📣 Shout-out in 5 min", 50], ["🎤 Duet with you on stage", 300]],
  Comedy: [["📣 Shout-out in 5 min", 50], ["🔥 Roast my friend", 150], ["😂 Custom joke about you", 100]],
  Fitness: [["📣 Shout-out in 5 min", 50], ["🏋️ Form check on your video", 200], ["📋 Personal 7-day plan", 250]],
};
