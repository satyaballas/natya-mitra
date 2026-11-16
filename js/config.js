// =============================================================
//  Natya Mitra – all tunable settings live in this file.
//  Edit thresholds, lesson plans and the teacher's phrases here.
// =============================================================

export const CONFIG = {
  speechRate: 0.9,          // teacher voice speed (kids like it a bit slow)
  musicVolume: 0.7,         // 0..1
  latencyMs: 150,           // phone-camera delay; raise if on-time stamps are scored "late"
  hintEveryMs: 6000,        // minimum gap between corrections (patience!)
  stepTimeoutMs: 30000,     // give up gently on a step after this much active time
  graceMs: 300,             // brief wobbles don't reset a hold
  hydrationEveryMin: 15,    // automatic water break if none happened for this long

  tempo: { start: 40, step: 4, min: 32, max: 72, passAccuracy: 0.7 },  // beats per minute
  rhythm: { windowMs: 350, countInBeats: 4, syllables: ['Thai', 'ya', 'Thai', 'hi'] },

  // ---- Pose & face thresholds (press D during a class to see live values) ----
  T: {
    vis: 0.5,              // landmark visibility needed
    straightKnee: 155,     // knee angle (deg) counted as straight
    aramandiMaxKnee: 152,  // knees must bend below this for Aramandi
    aramandiGoodKnee: 128, // "great" depth for a beginner
    aramandiMinKnee: 95,   // safety: deeper than this → "not so low"
    feetTogether: 0.75,    // ankle gap ÷ shoulder width (Samapadam)
    heelsTogether: 1.0,    // ankle gap ÷ shoulder width (Aramandi)
    kneesOutExtra: 0.3,    // knee gap must exceed ankle gap by this (turn-out)
    waistDist: 0.75,       // wrist→hip distance ÷ shoulder width = "hands on waist"
    upright: 12,           // max body lean (deg) for standing straight
    lean: 12,              // min lean (deg) for side bends
    armsUp: 0.6,           // wrists above shoulders by × torso length
    armsDown: -0.5,
    kneeLift: 0.35,        // knee raised above the other by × torso length
    toeTouch: -0.1,        // wrists near/below knee level (× torso)
    anjaliGap: 0.5,        // wrist gap ÷ shoulder width for joined hands
    eyeDist: 0.9,          // wrists near nose ÷ shoulder width
    lift: 0.1,             // foot lift (× torso) that counts as a stamp
    liftDown: 0.04,
    smile: 0.45, eyeWide: 0.25, jawOpen: 0.3, browUp: 0.4, frown: 0.15, look: 0.45,
  },

  // ---- Activities ----
  // sequence: steps checked one by one (hold = ms the pose must be held)
  // rhythm:   foot stamps to music;  break: water/rest timer
  activities: {
    welcome: { type: 'sequence', title: 'Namaste! 🙏', needs: 'body', intro: 'welcome',
      steps: [{ check: 'visible', hold: 1500, say: 'showYourself', demo: 'stand' }] },

    warmArms: { type: 'sequence', title: 'Warm-up: Arms Up & Down', needs: 'body', intro: 'warmupIntro', repeat: 4,
      steps: [
        { check: 'armsUp', hold: 800, say: 'armsUp', cue: 'up', demo: 'armsUp' },
        { check: 'armsDown', hold: 500, say: 'armsDown', cue: 'down', demo: 'armsDown' }] },

    warmSide: { type: 'sequence', title: 'Warm-up: Side Bends', needs: 'body', intro: 'sideIntro', repeat: 3,
      steps: [
        { check: 'leanEither', hold: 800, say: 'leanSide', demo: 'leanL' },
        { check: 'leanOther', hold: 800, say: 'leanOther', demo: 'leanR' }] },

    warmMarch: { type: 'sequence', title: 'Warm-up: Knee Lifts', needs: 'body', intro: 'marchIntro', repeat: 5,
      steps: [
        { check: 'kneeUpEither', hold: 300, say: 'kneeUp', cue: 'kneeUpCue', demo: 'kneeUpR' },
        { check: 'kneeUpOther', hold: 300, say: 'kneeOther', cue: 'kneeUpCue', demo: 'kneeUpL' }] },

    warmToes: { type: 'sequence', title: 'Warm-up: Touch Your Toes', needs: 'body', repeat: 3,
      steps: [
        { check: 'toeTouch', hold: 1000, say: 'toeTouch', demo: 'touchFloor' },
        { check: 'standStraight', hold: 600, say: 'standUp', demo: 'armsDown' }] },

    namaskaram: { type: 'sequence', title: 'Namaskaram 🙏', needs: 'body', intro: 'namaskaramIntro',
      steps: [
        { check: 'anjali', hold: 1500, say: 'handsTogether', demo: 'anjali' },
        { check: 'touchFloor', hold: 800, say: 'touchFloor', demo: 'touchFloor' },
        { check: 'touchEyes', hold: 800, say: 'touchEyes', demo: 'touchEyes' },
        { check: 'anjali', hold: 1500, say: 'handsTogether', demo: 'anjali' }] },

    closing: { type: 'sequence', title: 'Closing Namaskaram 🙏', needs: 'body', intro: 'closingIntro',
      steps: [
        { check: 'anjali', hold: 1500, say: 'handsTogether', demo: 'anjali' },
        { check: 'touchFloor', hold: 800, say: 'touchFloor', demo: 'touchFloor' },
        { check: 'touchEyes', hold: 800, say: 'touchEyes', demo: 'touchEyes' },
        { check: 'anjali', hold: 1500, say: 'handsTogether', demo: 'anjali' }] },

    samapadam: { type: 'sequence', title: 'Samapadam', needs: 'body', intro: 'samapadamIntro', repeat: 3,
      steps: [
        { check: 'samapadam', hold: 4000, say: 'samapadamDo', cue: 'samapadamCue', demo: 'stand' },
        { check: 'rest', hold: 1500, say: 'relax', demo: 'armsDown' }] },

    aramandi: { type: 'sequence', title: 'Aramandi', needs: 'body', intro: 'aramandiIntro', repeat: 4,
      steps: [
        { check: 'aramandi', hold: 3000, say: 'aramandiDo', cue: 'aramandiCue', demo: 'aramandi' },
        { check: 'standStraight', hold: 1500, say: 'standUp', demo: 'stand' }] },

    stanceSwitch: { type: 'sequence', title: 'Samapadam ↔ Aramandi', needs: 'body', intro: 'switchIntro', repeat: 4,
      steps: [
        { check: 'samapadam', hold: 1500, say: 'samapadamCue', demo: 'stand' },
        { check: 'aramandi', hold: 1500, say: 'aramandiCue', demo: 'aramandi' }] },

    tattu: { type: 'rhythm', title: 'Tatta Adavu – Foot Stamps 👣', intro: 'tattuIntro', rounds: 2, cycles: 2 },
    tattuMore: { type: 'rhythm', title: 'Tatta Adavu – Practice 👣', intro: 'tattuAgain', rounds: 2, cycles: 3 },

    faces: { type: 'sequence', title: 'Face Game – Abhinaya 😊', needs: 'face', intro: 'facesIntro',
      steps: [
        { check: 'smile', hold: 1500, say: 'smile', expr: 'happy', emoji: '😊' },
        { check: 'surprised', hold: 1200, say: 'surprised', expr: 'surprised', emoji: '😮' },
        { check: 'sad', hold: 1200, say: 'sad', expr: 'sad', emoji: '😢' },
        { check: 'eyesEither', hold: 800, say: 'lookSide', expr: 'lookA', emoji: '👀' },
        { check: 'eyesOther', hold: 800, say: 'lookOther', expr: 'lookB', emoji: '👀' },
        { check: 'smile', hold: 1500, say: 'smile', expr: 'happy', emoji: '😊' }] },

    break: { type: 'break', title: 'Water Break 🥤', secs: 120, say: 'waterBreak' },
    autoBreak: { type: 'break', title: 'Water Break 🥤', secs: 90, say: 'waterBreak' },
    restBreak: { type: 'break', title: 'Rest Time 😌', secs: 90, say: 'restSuggest' },
  },

  // main: done once in order; loop: repeated until time is nearly up; then closing.
  plans: {
    '30': { main: ['welcome', 'warmArms', 'warmMarch', 'namaskaram', 'samapadam', 'tattu', 'break', 'faces', 'aramandi', 'tattuMore'],
            loop: ['samapadam', 'tattuMore', 'faces'] },
    '45': { main: ['welcome', 'warmArms', 'warmSide', 'warmMarch', 'namaskaram', 'samapadam', 'aramandi', 'break', 'tattu', 'faces', 'stanceSwitch', 'tattuMore'],
            loop: ['tattuMore', 'samapadam', 'faces', 'aramandi'] },
    '60': { main: ['welcome', 'warmArms', 'warmSide', 'warmMarch', 'warmToes', 'namaskaram', 'samapadam', 'aramandi', 'break', 'tattu', 'faces', 'stanceSwitch', 'tattuMore'],
            loop: ['tattuMore', 'samapadam', 'faces', 'aramandi', 'warmArms'] },
  },
};

// =============================================================
//  Teacher phrases. {name} = child's name.
//  An array = pick one at random (in "mix" mode it says just one language).
//  A single object = says Telugu then English in "mix" mode.
//  Fix any Telugu wording to match how her teacher speaks!
// =============================================================
export const PHRASES = {
  welcome:        { te: 'నమస్తే {name}! రా, కలిసి డాన్స్ నేర్చుకుందాం!', en: "Namaste {name}! Let's learn dance together!" },
  showYourself:   { te: 'నాకు కనిపించేలా ముందు నిలబడు', en: 'Stand in front so I can see you.' },
  stepBack:       { te: 'కొంచెం వెనక్కి వెళ్ళు, నీ కాళ్ళు కనిపించాలి', en: 'Step back a little, I need to see your feet.' },
  comeClose:      { te: 'నా దగ్గరికి రా, నీ ముఖం చూడాలి', en: 'Come closer, I want to see your face.' },
  warmupIntro:    { te: 'ముందు వార్మప్ చేద్దాం!', en: "First, let's warm up!" },
  armsUp:         { te: 'చేతులు పైకి ఎత్తు', en: 'Arms up high!' },
  armsDown:       { te: 'చేతులు కిందకి దించు', en: 'Arms down.' },
  up:             { te: 'పైకి!', en: 'Up!' },
  down:           { te: 'కిందకి!', en: 'Down!' },
  sideIntro:      { te: 'ఇప్పుడు పక్కలకి వంగుదాం', en: "Now let's bend side to side." },
  leanSide:       { te: 'ఒక పక్కకి వంగు', en: 'Bend to one side.' },
  leanOther:      { te: 'ఇప్పుడు ఇంకో పక్కకి', en: 'Now the other side.' },
  marchIntro:     { te: 'ఇప్పుడు మోకాళ్ళు ఎత్తి నడుద్దాం', en: "Now let's march, lifting our knees." },
  kneeUp:         { te: 'మోకాలు పైకి ఎత్తు', en: 'Lift your knee up!' },
  kneeOther:      { te: 'ఇప్పుడు ఇంకో కాలు', en: 'Now the other leg.' },
  kneeUpCue:      { te: 'ఎత్తు!', en: 'Lift!' },
  toeTouch:       { te: 'కిందకి వంగి కాలి వేళ్ళు తాకు', en: 'Bend down and touch your toes.' },
  standUp:        { te: 'నిలబడు', en: 'Stand up.' },
  namaskaramIntro:{ te: 'ఇప్పుడు భూమాతకి నమస్కారం చేద్దాం', en: "Now let's do Namaskaram to Mother Earth." },
  closingIntro:   { te: 'చివరగా నమస్కారం చేద్దాం', en: "Let's finish with Namaskaram." },
  handsTogether:  { te: 'చేతులు జోడించు', en: 'Hands together.' },
  touchFloor:     { te: 'నేలను తాకు', en: 'Touch the floor.' },
  touchEyes:      { te: 'కళ్ళకు అద్దుకో', en: 'Touch your eyes.' },
  samapadamIntro: { te: 'ఇది సమపాదం. కాళ్ళు దగ్గరగా, చేతులు నడుము మీద.', en: 'This is Samapadam. Feet together, hands on waist.' },
  samapadamDo:    { te: 'సమపాదంలో నిలబడు', en: 'Stand in Samapadam.' },
  samapadamCue:   { te: 'సమపాదం!', en: 'Samapadam!' },
  relax:          { te: 'రిలాక్స్', en: 'Relax.' },
  aramandiIntro:  { te: 'ఇది అరమండి. మోకాళ్ళు పక్కలకి వంచి, సగం కూర్చో.', en: 'This is Aramandi. Bend your knees out to the sides, like half sitting.' },
  aramandiDo:     { te: 'అరమండి చెయ్యి', en: 'Do Aramandi.' },
  aramandiCue:    { te: 'అరమండి!', en: 'Aramandi!' },
  switchIntro:    { te: 'సమపాదం, అరమండి, మారుస్తూ చేద్దాం', en: "Let's switch between Samapadam and Aramandi." },
  tattuIntro:     { te: 'ఇప్పుడు తట్టడవు! బీట్ వచ్చినప్పుడు కాలు కొట్టు. ముందు కుడి కాలు.', en: 'Now Tatta Adavu! Stamp your foot on each beat. Right foot first.' },
  tattuAgain:     { te: 'మళ్ళీ తట్టడవు ప్రాక్టీస్ చేద్దాం', en: "Let's practise Tatta Adavu again." },
  tattuReady:     { te: 'రెడీ? నేను లెక్క పెడతాను', en: 'Ready? Listen to the count.' },
  listenBeat:     { te: 'బీట్ విను, దానితో పాటు కొట్టు', en: 'Listen to the beat and stamp with it.' },
  liftFoot:       { te: 'కాలు కొంచెం పైకి ఎత్తి గట్టిగా కొట్టు', en: 'Lift your foot a little and stamp firmly.' },
  fasterNext:     { te: 'సూపర్! ఇప్పుడు కొంచెం వేగంగా', en: 'Super! Now a little faster.' },
  sameSpeed:      { te: 'ఇంకోసారి అదే స్పీడ్ లో చేద్దాం', en: "Let's do it once more at the same speed." },
  facesIntro:     { te: 'ఇప్పుడు ముఖ భావాల ఆట! నా దగ్గరికి రా', en: "Now the face game! Come close to me." },
  smile:          { te: 'చక్కగా నవ్వు', en: 'Give me a big smile!' },
  surprised:      { te: 'ఆశ్చర్యంగా చూడు, కళ్ళు పెద్దవి చెయ్యి', en: 'Look surprised! Big eyes!' },
  sad:            { te: 'బాధగా ముఖం పెట్టు', en: 'Now make a sad face.' },
  lookSide:       { te: 'తల కదపకుండా, కళ్ళతో ఒక పక్కకి చూడు', en: 'Without moving your head, look to one side with your eyes.' },
  lookOther:      { te: 'ఇప్పుడు ఇంకో పక్కకి చూడు', en: 'Now look to the other side.' },
  praise: [
    { te: 'చాలా బాగుంది!', en: 'Very good!' },
    { te: 'శభాష్!', en: 'Shabash!' },
    { te: 'సూపర్!', en: 'Super!' },
    { te: 'భలే చేశావు!', en: 'Well done!' },
    { te: 'అద్భుతం!', en: 'Wonderful!' },
  ],
  nextOne:        { te: 'పర్లేదు, తర్వాతది చేద్దాం', en: "That's okay, let's try the next one." },
  waterBreak:     { te: 'బ్రేక్ టైం! కొంచెం నీళ్ళు తాగు', en: 'Break time! Drink some water.' },
  breakEnding:    { te: 'ఇంకా పది సెకన్లు', en: 'Ten more seconds.' },
  letsContinue:   { te: 'మళ్ళీ మొదలుపెడదాం!', en: "Let's start again!" },
  restSuggest:    { te: 'అలిసిపోయావా? కొంచెం రెస్ట్ తీసుకుందాం', en: "Tired? Let's take a little rest." },
  sessionDone:    { te: 'ఈరోజు చాలా బాగా చేశావు! రేపు కలుద్దాం', en: 'You did great today! See you tomorrow.' },
  // corrections (hint keys from poses.js)
  feetTogether:   { te: 'కాళ్ళు దగ్గరగా పెట్టు', en: 'Keep your feet together.' },
  handsWaist:     { te: 'చేతులు నడుము మీద పెట్టు', en: 'Hands on your waist.' },
  standStraight:  { te: 'నిటారుగా నిలబడు', en: 'Stand nice and straight.' },
  kneesStraight:  { te: 'మోకాళ్ళు నేరుగా ఉంచు', en: 'Keep your knees straight.' },
  bendKnees:      { te: 'మోకాళ్ళు కొంచెం వంచు', en: 'Bend your knees a little.' },
  kneesOut:       { te: 'మోకాళ్ళు పక్కలకి తిప్పు', en: 'Turn your knees out to the sides.' },
  tooLow:         { te: 'అంత కిందకి వద్దు, కొంచెం పైకి', en: 'Not so low, come up a little.' },
  heelsTogether:  { te: 'మడమలు దగ్గరగా పెట్టు', en: 'Keep your heels together.' },
  armsHigher:     { te: 'చేతులు ఇంకా పైకి', en: 'Arms higher!' },
  bendMore:       { te: 'ఇంకా కొంచెం వంగు', en: 'Bend a little more.' },
  handsChest:     { te: 'చేతులు ఛాతీ దగ్గర జోడించు', en: 'Join your hands near your chest.' },
  handsEyes:      { te: 'చేతులు కళ్ళ దగ్గరికి', en: 'Hands up to your eyes.' },
  smileMore:      { te: 'ఇంకా పెద్దగా నవ్వు', en: 'Bigger smile!' },
  bigEyes:        { te: 'కళ్ళు పెద్దవి చెయ్యి', en: 'Make your eyes big!' },
  sadMore:        { te: 'ఇంకా కొంచెం బాధగా', en: 'A little more sad.' },
  eyesMore:       { te: 'కళ్ళు ఇంకా పక్కకి', en: 'Move your eyes more to the side.' },
};
