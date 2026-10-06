import { CallerPersona, DJ } from '../types/station';
import { DialogueTurn } from '../services/gemini';

export interface PersonaIdentityDefinition {
  voiceTag: string;
  archetype: string;
  names: string[];
  suburbs: string[];
  sampleTopics: string[];
  sampleEscalations: string[];
  sampleCutoffs: string[];
  hostReacts: string[];
  hostRoasts: string[];
}

export interface AssignedCallerIdentity {
  name: string;
  suburb: string;
  line: number;
  caller: CallerPersona;
}

export const PERSONA_IDENTITIES: Record<string, PersonaIdentityDefinition> = {
  THE_ZEF: {
    voiceTag: 'THE_ZEF',
    archetype: 'The Boet',
    names: ['Jaco', 'Ruan', 'Kyle', 'Franco', 'Dewald', 'Wian'],
    suburbs: ['Brakpan', 'Boksburg', 'Benoni', 'Springs', 'Kempton Park'],
    sampleTopics: [
      'Listen here boet, some clown in a blue Polo Vivo just cut me off on the N12 and made me spill my energy drink!',
      'My bru, some guy at the gym had the audacity to use the bench press while I was resting between sets!',
      'Howzit boet, I just spent three grand putting a louder exhaust on my Golf and my neighbour called the police!',
    ],
    sampleEscalations: [
      'My GTi is an apex predator, china! I had to rev him in reverse at the robot just to establish dominance!',
      "Bro, it's about the pump! If you don't superset with Monster Energy, you're just existing, not living!",
      'It is an acoustic performance mod, my bru! The whole of Brakpan deserves to hear all seventy kilowatts!',
    ],
    sampleCutoffs: [
      'Wait, boet, check my burnout video on TikT—',
      "Don't cut me off bru, my boykie is waiting to rev h—",
      "Bru, you don't even know what a downpipe is, you're just jeal—",
    ],
    hostReacts: [
      'A Polo? Bro, you drive a Citi Golf with no front bumper and three different colored doors. Who are you calling a clown?',
      "Resting between sets? You've been sitting on that bench scrolling TikTok for forty minutes!",
      "Your exhaust sounds like a lawnmower falling down the stairs. I'd call the police on you too!",
    ],
    hostRoasts: [
      "The only thing you're dominating is your mother's electricity bill. Get off my airwaves!",
      'Your brain has fewer horsepower than a bicycle. That line is terminated, goodbye!',
      'Go drink a glass of water and learn what a muffler is. Cut the line!',
    ],
  },

  THE_MANAGER: {
    voiceTag: 'THE_MANAGER',
    archetype: 'The "Karen"',
    names: ['Brenda', 'Cheryl', 'Karen', 'Beverly', 'Marinda', 'Annelize'],
    suburbs: ['Fourways', 'Centurion', 'Silver Lakes', 'Dainfern', 'Waterkloof'],
    sampleTopics: [
      'Excuse me! I have been holding for eight minutes listening to that dreadful rock music! It is completely unacceptable!',
      'I am calling to report a silver hatchback parked three centimeters over the demarcated bay at the shopping centre!',
      'Your previous presenter used improper language and I have already drafted a letter to the broadcasting complaints commission!',
    ],
    sampleEscalations: [
      'I want to speak to your station manager immediately! Do you have any idea who my husband is on the body corporate?!',
      'Order is what separates civilization from chaos! I had the vehicle clamped and the security guard reprimanded!',
      'I run the neighbourhood WhatsApp group! I can mobilize forty-eight furious housewives within ten minutes!',
    ],
    sampleCutoffs: [
      'Do NOT hang up on me, you will hear from my lawy—',
      'I am taking your employee number down right no—',
      'My husband is a platinum member at the country clu—',
    ],
    hostReacts: [
      'You called a shock jock radio hotline, Brenda. What did you expect, classical harp music?',
      'Three centimeters? Brenda, do you carry a tape measure in your purse just to harass strangers?',
      "A letter? Brenda, the BCCSA blocked our station's email three years ago. What's your point?",
    ],
    hostRoasts: [
      'Even your husband hides in the tool shed when your car pulls into the driveway. Goodbye!',
      'The only thing getting clamped today is your loud mouth. Hang up the phone!',
      "Mobilize whoever you want, lady, just don't mobilize them onto my frequency. Line dumped!",
    ],
  },

  THE_SIMP: {
    voiceTag: 'THE_SIMP',
    archetype: 'The Corporate Simp',
    names: ['Tristan', 'Chad', 'Liam', 'Matthew', 'Cameron', 'Kyle'],
    suburbs: ['Rosebank', 'Bryanston', 'Waterfall City', 'Sandton', 'Morningside'],
    sampleTopics: [
      'Hey team! Love the energy on the broadcast today! Just wanted to touch base regarding the synergy of your morning playlist.',
      "Hi guys! I'm dialing in between my agile standups because I feel like your listener engagement KPIs are suboptimal.",
      'Quick thought leaders question: are we maximizing cross-functional collaboration between your tracks and your traffic alerts?',
    ],
    sampleEscalations: [
      'Look, we need to optimize our touchpoints and leverage our core competencies to shift the paradigm!',
      "It's about data-driven deliverability! If you don't track your broadcast churn rate, what are you even building?!",
      'I can build you an interactive Notion dashboard in fifteen minutes to streamline your content flywheel!',
    ],
    sampleCutoffs: [
      'Wait, can we schedule a quick ten-minute sync offli—',
      'Let me send you a deck on Slack to circle ba—',
      "Wait, let's take this offline and align on actionabl—",
    ],
    hostReacts: [
      'Touch base? Did you seriously dial a live radio station during work hours to use LinkedIn buzzwords on me?',
      'Tristan, this is a radio show, not a sprint review. Do you ever speak like an actual human being?',
      "Cross-functional collaboration? Liam, it's a song and a guy yelling about traffic. That's it!",
    ],
    hostRoasts: [
      'The only thing getting shifted is your call straight into the digital trash bin. Goodbye Tristan!',
      'Flywheel your way out of my audio feed and go do the job your boss is paying you for. Next caller!',
      "I'd rather listen to dial-up internet than your synergy pitch. Line terminated!",
    ],
  },

  THE_OG: {
    voiceTag: 'THE_OG',
    archetype: 'The Nigerian Big Man',
    names: ['Emeka', 'Chidi', 'Chief Obi', 'Kingsley', 'Prince', 'Blessing'],
    suburbs: ['Sunnyside', 'Midrand', 'Sandton', 'Randburg', 'Kempton Park'],
    sampleTopics: [
      'My brother! Tell your listeners to stop complaining about fuel prices! Money is everywhere if your mind is big!',
      "How are you doing my guy! I'm sitting in my G-Wagon laughing at people stressing about small things!",
      "Chief! Why are your callers crying about bank charges? When you do international transactions, you don't sweat peanuts!",
    ],
    sampleEscalations: [
      "Ha-ha! When you do international import and export, you don't look at price tags! I buy the whole garage if I want!",
      'Listen, poverty is a mindset! If you wake up at noon, how will the millions locate you?! Hustle must be loud!',
      'My tailor flies from Lagos just to measure my traditional agbada! You must think in dollars, not rands, my brother!',
    ],
    sampleCutoffs: [
      'No wahala, my brother! Stay blessed and think b—',
      'God will elevate you my guy, remember to dream in doll—',
      'Call me when you want to invest in real estat—',
    ],
    hostReacts: [
      "Easy to say when you're rolling around in a Mercedes with personalized gold plates that cost more than my house!",
      'Chief, half the city is trying to survive on two-minute noodles and you are flexing G-Wagons on the radio!',
      'Peanuts? Emeka, some of our listeners have twelve rand left in their accounts!',
    ],
    hostRoasts: [
      'Chief, buy yourself a better phone connection before you buy the garage. We are cutting you loose!',
      "May the millions locate your mute button. Stay blessed, Chief, we're out of time!",
      "Think in rands, think in dollars, just don't think on my frequency. Goodbye Chief!",
    ],
  },

  THE_HUN: {
    voiceTag: 'THE_HUN',
    archetype: 'The MLM Seller',
    names: ['Candice', 'Monique', 'Chantal', 'Tanith', 'Bianca', 'Roxanne'],
    suburbs: ['Krugersdorp', 'Roodepoort', 'Alberton', 'Weltevreden Park', 'Boksburg'],
    sampleTopics: [
      'Hey hun! Quick question: are you tired of the toxic nine-to-five grind and negative radio frequencies draining your gut biome?',
      'Omg hey babes! I was just diffusing eucalyptus and feeling called to share this life-changing financial abundance opportunity!',
      'Hey guys! Just hopping on between packing wellness orders for my downline! Have you considered detoxifying your lifestyle?',
    ],
    sampleEscalations: [
      "It's NOT a pyramid, babes! It's a multi-tier wellness sisterhood! My organic belly tea cured my husband's snoring!",
      'I earned a pink Hyundai Atos last month, okay! All you need is five hundred rand and an open heart!',
      'Our lavender mist aligns your root chakra with the galactic core! The testimonials speak for themselves, hun!',
    ],
    sampleCutoffs: [
      'Check your DMs hun, you can be your own bo—',
      'Wait babes, let me send you the free PDF brochu—',
      'Just drop a heart emoji in my comments to get start—',
    ],
    hostReacts: [
      'Wait, are you seriously trying to pitch me an essential oil pyramid scheme live on air right now?',
      "Financial abundance? Candice, you're selling glorified weed-killer in brown glass bottles from your spare bedroom!",
      'Downline? Monique, that is the literal dictionary definition of a pyramid scheme!',
    ],
    hostRoasts: [
      "Your husband is snoring because he's faking a coma to avoid talking to you. Bye babes!",
      'A pink Hyundai Atos is not a flex, Candice. Go align your root chakra somewhere else. Click!',
      'The only thing getting detoxed today is you from this phone switchboard. Goodbye hun!',
    ],
  },

  THE_UNCLE: {
    voiceTag: 'THE_UNCLE',
    archetype: 'The "Racist" Uncle',
    names: ['Oom Piet', 'Frikkie', 'Johan', 'Koos', 'Gert', 'Hennie'],
    suburbs: ['Meyerton', 'Nigel', 'Vanderbijlpark', 'Springs', 'Witbank'],
    sampleTopics: [
      "Ja, nee kyk, I'm sitting here by the bakkie and I tell you, this municipality doesn't know how to tar a pothole!",
      "Middag! I'm listening to this modern music you're playing and it sounds like a cat stuck in a combine harvester!",
      'Look here, I was at the hardware store this morning and the young oke behind the counter did not even know what a six-inch nail is!',
    ],
    sampleEscalations: [
      'Because my Hilux lost an axle in that crater, man! In nineteen-eighty-four we fixed roads ourselves with cement and a shovel!',
      'Back in my day a song had an accordion and words you could understand, not this computer doef-doef rubbish!',
      'Nobody wants to work anymore, man! Everyone just wants to look at their cellphones and drink fancy cold coffee!',
    ],
    sampleCutoffs: [
      "Don't tell me to braai, you young punk, back in the day w—",
      "You kids don't know the value of hard labour, in my tim—",
      'I am writing to the town clerk, you mark my word—',
    ],
    hostReacts: [
      'Oom, you call in every single week to complain about the exact same pothole on the R59!',
      'A cat in a combine harvester? Oom Frikkie, that was Led Zeppelin!',
      "He's an eighteen-year-old cashier, Oom, not a master carpenter. Leave the kid alone!",
    ],
    hostRoasts: [
      'Then go grab your shovel, Oom, and leave my radio station alone. Go braai a chop!',
      'Go dust off your cassettes and put some earplugs in. Line terminated!',
      'If you miss nineteen-eighty-four so much, go find a time machine. Goodbye, Oom!',
    ],
  },

  THE_SNOB: {
    voiceTag: 'THE_SNOB',
    archetype: 'The Gentrifier',
    names: ['Julian', 'Sebastian', 'Oliver', 'Felix', 'Alistair', 'Rupert'],
    suburbs: ['Parkhurst', 'Melville', 'Linden', 'Greenside', 'Craighall Park'],
    sampleTopics: [
      'Honestly, I am just shuddering at the sonic texture of your broadcast. It is so... uncurated and aggressively loud.',
      "Hello. I'm calling from my vintage steel-frame bicycle to express mild dismay at the lack of artisanal depth in your programming.",
      'Is there any particular reason your station plays music intended for the lowest common denominator?',
    ],
    sampleEscalations: [
      "You wouldn't understand acoustic terroir. My flat white barista and I were just critiquing your atrocious dynamic range.",
      'I only consume fermented audio experiences recorded on analogue reel-to-reel tape in a cabin in Dullstroom!',
      'The cultural wasteland east of the highway is truly staggering. You probably drink instant coffee from a tin!',
    ],
    sampleCutoffs: [
      "So utterly derivative and provincial, I'm unsubscri—",
      'You have zero appreciation for ambient frequencies, pleb—',
      'I shall be documenting this barbaric interaction on Substac—',
    ],
    hostReacts: [
      'Uncurated? Julian, this is Foul Play FM, not an acoustic indie poetry reading in a converted shipping container.',
      "Artisanal depth? Sebastian, we're a shock jock radio station, not an organic sourdough workshop!",
      'Lowest common denominator? Oliver, our listeners love loud rock and bakkies, what did you expect?',
    ],
    hostRoasts: [
      'Tell your barista to brew you a decaf and shove his sourdough where the sun does not shine. Next!',
      'Take your vintage bicycle and pedal it straight into the nearest duck pond. Goodbye, Julian!',
      'I drink whatever coffee wakes me up, you pretentious wanker. Line disconnected!',
    ],
  },

  THE_BOOMER: {
    voiceTag: 'THE_BOOMER',
    archetype: 'The "Back in My Day"',
    names: ['Arthur', 'Harold', 'Kobus', 'Neville', 'Trevor', 'Derek'],
    suburbs: ['Florida', 'Germiston', 'Edenvale', 'Roodepoort West', 'Brakpan'],
    sampleTopics: [
      'Young man, I went to the bank this morning and they told me I have to use an app! An application on a glass screen!',
      'Good morning! Why does my new television remote have sixty buttons?! All I want is the SABC and the volume control!',
      'I received a text message saying my parcel is detained at the post office, but I have not ordered anything since nineteen-ninety-two!',
    ],
    sampleEscalations: [
      'I want a teller with a stamp and a carbon copy receipt! What happens when the satellites run out of diesel, hey?!',
      'Everything was better when you had to get up off the couch to change the channel on the wooden console!',
      'I already sent them my banking PIN and my ID book! The lady said she works for the United Nations postal depot!',
    ],
    sampleCutoffs: [
      'Wait! What button do I press to hang up this damn th—',
      "Don't cut me off, where is the red button on the han—",
      "My grandson said he'd fix the microwave, but he's always on his compu—",
    ],
    hostReacts: [
      "Harold, banking apps have been around for fifteen years. You're holding a landline phone right now, aren't you?",
      'Arthur, there are four buttons on that remote. One is power, two are volume, and one is channel.',
      'Kobus, that is an obvious phishing scam! Do NOT click on any links or send them your pension money!',
    ],
    hostRoasts: [
      "When the satellites run out of diesel, we'll still be hanging up on you. Put down the handset, Harold!",
      'Go back to your armchair and have a nap, Arthur. We are cutting you off.',
      'Kobus, hang up the phone right now and call your bank before your pension is in the Cayman Islands! Goodbye!',
    ],
  },

  THE_CRACKHEAD: {
    voiceTag: 'THE_CRACKHEAD',
    archetype: 'The Florida Man',
    names: ['Wayne', 'Skollie', 'Shane', 'Clint', 'Spider', 'JJ'],
    suburbs: ['Hillbrow', 'Yeoville', 'Boksburg North', 'Turffontein', 'Rosettenville'],
    sampleTopics: [
      "Listen to me closely! The traffic lights aren't off because of load shedding, they're downloading human memories into the storm drains!",
      'Hey bra! Did you see the cloud over the mine dump yesterday?! It had teeth, man, triangular teeth like a shark!',
      'Bra, I found twenty meters of shiny copper cable under the railway bridge, but the pigeons are guarding it with laser eyes!',
    ],
    sampleEscalations: [
      'The mayor is trading copper pipes to an underground lizard syndicate! The pigeons work for the South African Revenue Service, bra!',
      'I drank the water from the cooling tower and now I can hear the municipal budget through my fillings!',
      'If you wrap your head in three layers of heavy-duty foil, the traffic cameras cannot scan your pineal gland, bra!',
    ],
    sampleCutoffs: [
      "The birds know my cell number! Don't look down the sew—",
      "They're coming through the air conditioner, bra, hide the batte—",
      "Tell my cousin in Boksburg I didn't steal the bakkie batte—",
    ],
    hostReacts: [
      'Wayne... are you standing inside an open electrical substation again?',
      'A cloud with teeth? Shane, what on earth did you smoke behind the chemist this morning?',
      'Pigeons guarding copper? Clint, you are describing bird droppings on a power line!',
    ],
    hostRoasts: [
      'Wayne, put the copper wire down and drink some tap water. We are cutting you off!',
      'Shane, go check into a clinic before you try to fight a traffic light. Next caller!',
      'The only thing getting scanned is your brain being fried. Line dumped!',
    ],
  },

  THE_DIVORCEE: {
    voiceTag: 'THE_DIVORCEE',
    archetype: 'The Bitter Ex',
    names: ['Tanya', 'Sharon', 'Debbie', 'Vanessa', 'Lizelle', 'Renette'],
    suburbs: ['Constantia Kloof', 'Bedfordview', 'Pretoria East', 'Northcliff', 'Helderkruin'],
    sampleTopics: [
      'I just saw my ex-husband driving past the gym with his twenty-two-year-old dental receptionist girlfriend!',
      'Can we discuss why men under fifty are completely emotionally stunted narcissists who deserve zero custody?!',
      'My ex tried to deduct his country club golf membership from my spousal maintenance payment this month!',
    ],
    sampleEscalations: [
      'That is not the point! He is using the BMW I specifically cursed in our mediation settlement! He has zero remorse!',
      'I hired an aerial drone to follow him to his mistress Pilates studio! I will burn his pension to the ground!',
      'My therapist says I need to channel my rage, and my rage says his golf clubs belong at the bottom of the dam!',
    ],
    sampleCutoffs: [
      "I'm calling his tax auditor right now, just watch m—",
      "He'll never see that golden retriever again, I swore on my moth—",
      'My attorney Advocate Deon is already filing the affidav—',
    ],
    hostReacts: [
      'Sharon, didn’t you finalize that divorce three years ago and take both his beach houses and the golden retriever?',
      "Debbie, you've been on our show four times this month talking about the same ex-husband. Let it go!",
      'Tanya, the golf club fees are between you and your divorce attorney, not a shock jock radio host!',
    ],
    hostRoasts: [
      'Have another glass of Sauvignon Blanc and let the poor guy drive his BMW in peace. Goodbye, Sharon!',
      'Channel your rage into getting a hobby that does not involve aviation surveillance. Line dropped!',
      'Throw the clubs in the dam, just throw yourself off my airwaves first. Next caller!',
    ],
  },

  THE_SPAZA: {
    voiceTag: 'THE_SPAZA',
    archetype: 'The Somali Shopkeeper',
    names: ['Ahmed', 'Farhan', 'Abdi', 'Yusuf', 'Hassan'],
    suburbs: ['Mayfair', 'Fordsburg', 'Tembisa', 'Lenasia', 'Alexandra'],
    sampleTopics: [
      'My brother! People come to my shop crying that the economy is finished, but they still have twenty rand for single cigarettes!',
      'Howzit my friend! Why are people in Johannesburg so lazy? Six people come ask for credit for one loaf of bread!',
      'My brother! The municipal inspector came today asking for trade permits. I gave him two energy drinks and a packet of biscuits, problem solved!',
    ],
    sampleEscalations: [
      'Business is business, my friend! If they do not buy from Ahmed, they buy from down the road! But always pay cash, no book today!',
      'In Somalia we wake up at four in the morning to herd camels! Here people wake up at ten and complain the sun is hot!',
      'Bribe? It is African hospitality, my brother! Biscuits are culture, not corruption! He was hungry!',
    ],
    sampleCutoffs: [
      'Come by for sweet Somali tea later, my brother, half pri—',
      'Don’t forget, cash only, no credit for radio presenters eith—',
      'Tell your listeners fresh bananas arriving four o’clock sha—',
    ],
    hostReacts: [
      "You run the shop, Ahmed! You're the one selling them the loose cigarettes and the sugar beans!",
      'Six people on credit? Ahmed, you run a corner spaza shop, not a microfinance bank!',
      'Did you just confess to bribing a municipal health inspector with biscuits live on Gauteng radio?',
    ],
    hostRoasts: [
      'Sound financial advice from the emperor of Mayfair. Keep hustling, Ahmed, we gotta run!',
      'Camels or spaza shops, keep the hustle going, just keep it off my phone lines for now. Cheers Ahmed!',
      "Enjoy the biscuits, Ahmed, just don't offer me any on the radio. Next caller!",
    ],
  },

  THE_LAWYER: {
    voiceTag: 'THE_LAWYER',
    archetype: 'The Litigious Guy',
    names: ['Advocate Deon', 'Bradley', 'Werner', 'Advocate Louw', 'Martin'],
    suburbs: ['Waterkloof', 'Houghton', 'Sandhurst', 'Brooklyn', 'Hyde Park'],
    sampleTopics: [
      'I am placing you on formal record. Your previous on-air commentary constitutes actionable defamation under common law!',
      'Counsel, I am dialing in to advise you that your station audio output breached municipal decibel thresholds during my commute!',
      'Be advised: my firm is currently preparing a class-action interdict against the Johannesburg Roads Agency for tire degradation!',
    ],
    sampleEscalations: [
      'Section thirty-six of the constitution guarantees my dignity! My instructing attorneys are drafting an urgent High Court application!',
      'I have already recorded this transmission! Ignorance of the law is no defense, sir, you will be subpoenaed by three o’clock!',
      'The precedent set in S v Van Der Merwe clearly outlines strict liability for infrastructural neglect! I am claiming punitive damages!',
    ],
    sampleCutoffs: [
      'You will be receiving my sheriff of the court by midda—',
      'My billable rate is four thousand an hour and you are wast—',
      'I shall hold you personally liable in your private capaci—',
    ],
    hostReacts: [
      'Deon, we were making fun of bad drivers on the N1. Did you really take that personally?',
      'Municipal decibel thresholds? Bradley, turn the volume knob down on your own car radio!',
      "A class-action over pothole tires? Werner, you've been preparing that lawsuit since 2018!",
    ],
    hostRoasts: [
      'Tell your instructing attorneys to draft a refund for your personality. You have no case, counselor. Click!',
      'Subpoena these nuts, Bradley. That line is dismissed with costs!',
      'Go file your paperwork in the rubbish bin where it belongs. Case closed, goodbye!',
    ],
  },

  THE_SCROLLER: {
    voiceTag: 'THE_SCROLLER',
    archetype: 'The Chronically Online',
    names: ['Keagan', 'Aiden', 'Tyler', 'Jayden', 'Caleb'],
    suburbs: ['Greenstone', 'Menlyn Maine', 'Fourways', 'Broadacres', 'Centurion'],
    sampleTopics: [
      'Yo, no cap bruh, this radio station is giving major NPC energy, like deadass lowkey boomer core.',
      'Bro, is it just me or is this entire broadcast completely unhinged? Like, where is the rizz, honestly?',
      'Yo chat, I just opened TikTok while waiting at the traffic lights and I have been sitting through three green cycles.',
    ],
    sampleEscalations: [
      "Bro is coping so hard right now, it's actually wild! Your aura is literally minus ten thousand, on god!",
      "It's giving gatekeeping, bro! You guys need to get griddy on the radio or you're falling off for real!",
      'I literally cannot focus unless there is Subway Surfers gameplay running underneath your voice, no cap!',
    ],
    sampleCutoffs: [
      'Bro just clipped me for a TikTok edit, that is L ri—',
      "Deadass don't ban me, I'm streaming this to two followe—",
      'Bro is so triggered, wait till my group chat sees th—',
    ],
    hostReacts: [
      'Speak English, Keagan! Did you just string four TikTok buzzwords together in a single sentence?',
      "Rizz? Aiden, this is a radio station, not a Twitch live stream! Put the phone down!",
      "Three green cycles? Tyler, you're the reason the whole intersection is backed up to the highway!",
    ],
    hostRoasts: [
      "Go touch grass, put your phone on airplane mode, and find a job. You're cut off!",
      'Minus ten thousand aura is still more personality than your entire generation. Goodbye Aiden!',
      "I'll give you Subway Surfers when you get hit by an actual train. Get off my line!",
    ],
  },

  THE_VICTIM: {
    voiceTag: 'THE_VICTIM',
    archetype: 'The Gig Economy Worker',
    names: ['Sipho', 'Thabo', 'Vusi', 'Bongani', 'Musa'],
    suburbs: ['Soweto', 'Tembisa', 'Mamelodi', 'Alexandra', 'Katlehong'],
    sampleTopics: [
      'Eish, my bra! I just rode fourteen kilometers through torrential rain on a delivery scooter for one cold iced latte!',
      'Sho my brother! The app gave me a triple order: chicken wings in Sandton, sushi in Rosebank, and groceries in Midrand, all in twenty minutes!',
      'Hauw bra, people in gated estates are completely crazy! Security made me leave my ID, take off my helmet, and walk two kilometers uphill!',
    ],
    sampleEscalations: [
      'A tip?! The lady gave me a one-star rating on the app because the paper cup was sweating! Sweating from the ice, bra!',
      "If I'm two minutes late, the algorithm docks my pay! Taxis are pushing me off the highway and the app is sending passive-aggressive notifications!",
      "Yes! With twenty kilograms of groceries on my spine, and then the guy's Boerboel chased me into the swimming pool!",
    ],
    sampleCutoffs: [
      'Next time I eat the chicken wings too, bra, check you la—',
      'Tell the Sandton people to tip cash, not smiley fac—',
      'Eish, the order is cancelled, now I have three tubs of ice crea—',
    ],
    hostReacts: [
      'One iced latte in the rain? Sipho, did the customer at least leave you a decent tip?',
      'Sandton to Midrand in twenty minutes on a scooter? Thabo, that violates the laws of physics!',
      "Walk uphill in the estate? Vusi, didn't you have the delivery bag on your back?",
    ],
    hostRoasts: [
      'Next time drink the iced latte yourself, Sipho. People have lost their minds. Stay safe out there!',
      'Delete the app and tell the algorithm to ride the scooter itself. Cheers Thabo, take care!',
      'Jump out of the pool and jump off our phone line, Vusi. Respect the hustle, stay safe!',
    ],
  },

  THE_NPC: {
    voiceTag: 'THE_NPC',
    archetype: 'The Customer Support',
    names: ['Darren', 'Kevin', 'Jason', 'Brandon', 'Clinton'],
    suburbs: ['Cresta', 'Randburg', 'Midrand', 'Weltevredenpark', 'Horizon'],
    sampleTopics: [
      'Thank you for calling. Have you attempted to power cycle your broadcast transmission unit by disconnecting the power cord for thirty seconds?',
      'Good day valued caller. Please note that all calls are recorded for quality assurance and training purposes.',
      'I am contacting you regarding reference ticket number nine-eight-four-dash-B, concerning intermittent audio stutter on your frequency.',
    ],
    sampleEscalations: [
      'I understand your frustration, sir. Please remain on the line while I escalate this ticket to our tier two technical team.',
      "Please confirm your account number, billing address, and mother's maiden name before we proceed with troubleshooting.",
      'System diagnostics indicate an unauthorized user is speaking into the microphone. Initiating standard diagnostic reset.',
    ],
    sampleCutoffs: [
      'Your estimated wait time is currently forty-two min—',
      'Please rate my service from one to five stars after the to—',
      'Error four-zero-four, presenter response not recogniz—',
    ],
    hostReacts: [
      "Darren, you're the one calling us! Why are you reading customer support script prompts to me?",
      'Quality assurance? Kevin, you dialed my studio line on your personal phone!',
      'Reference ticket? Jason, we are a live rock station, not an IT help desk!',
    ],
    hostRoasts: [
      'Escalate this straight to dial tone. Darren, you are free from your script. Goodbye!',
      'The only troubleshooting needed is troubleshooting your robotic personality. Line dropped!',
      'Reset this, robot. Goodbye Darren, disconnect!',
    ],
  },

  THE_GRIND: {
    voiceTag: 'THE_GRIND',
    archetype: 'The "Alpha" Hustler',
    names: ['Dylan', 'Keanu', 'Brandon', 'Connor', 'Marco'],
    suburbs: ['Morningside', 'Sandton', 'Bedfordview', 'Meyersdal', 'Pretoria East'],
    sampleTopics: [
      "Bro, while you're spinning cheesy radio tunes, I've already closed three dropshipping pipelines and done ninety minutes of zone two cardio.",
      'Listen to me, alpha mindset is the only currency that matters in twenty-twenty-six. Most men are just coasting on low testosterone!',
      "What's up bro! I'm currently fasting on black coffee and sea salt while managing six automated crypto trading bots!",
    ],
    sampleEscalations: [
      "It's a mindset, bro! Winners don't make excuses, winners deploy algorithmic leverage while the sheep sleep!",
      'I wake up at three-thirty AM every single day to look in the mirror and remind myself that pain is just weakness leaving the body!',
      "Market volatility is an opportunity for asymmetric gains, bro! If you don't stake your yield, you're trapped in the matrix!",
    ],
    sampleCutoffs: [
      "You're trapped in the matrix, bro, enjoy your broke wa—",
      'Follow my masterclass on Telegram for the full disclosu—',
      "Alpha males don't get hung up on, bro, wait till my podca—",
    ],
    hostReacts: [
      "Dylan, you live in your parents' garden cottage in Bedfordview. What dropshipping pipelines are you closing?",
      "Zone two cardio? Keanu, you're out of breath just dialing a seven-digit telephone number!",
      'Brandon, your six crypto bots lost eighty percent of their value last Tuesday. Don’t preach about alpha mindsets!',
    ],
    hostRoasts: [
      'Deploy some algorithmic leverage on your rent payment to your mother. We are cutting your line, champion.',
      'Weakness might be leaving your body, but common sense left years ago. Goodbye Dylan!',
      'Enjoy your sea salt and your cottage, bro. That line is terminated!',
    ],
  },

  THE_FANBOY: {
    voiceTag: 'THE_FANBOY',
    archetype: 'The Brand Loyalist',
    names: ['Sheldon', 'Ethan', 'Sheldon-Lee', 'Kyle', 'Justin'],
    suburbs: ['Centurion', 'Randburg', 'Roodepoort', 'Northriding', 'Fairland'],
    sampleTopics: [
      'I just heard you make a sarcastic joke about the new titanium flagship smartphone, and frankly your tech illiteracy is disgusting.',
      'Hello! I am calling to correct your presenter completely inaccurate description of our favorite German automotive twin-turbo system!',
      'Excuse me, but your audio compression codec is clearly inferior to the proprietary lossless streaming standard adopted by industry leaders!',
    ],
    sampleEscalations: [
      'It is about ecosystem integration! You simply don’t comprehend the thermal dissipation efficiency of the thirty-six core neural processing engine!',
      'The engineering tolerances are within point zero zero one millimeters! You cannot compare superior German telemetry to peasant machinery!',
      'I have been a loyal brand ambassador since twenty-twelve! I have the corporate logo tattooed on my shoulder blade!',
    ],
    sampleCutoffs: [
      'The benchmark scores don’t lie, you uneducated ple—',
      "Wait till the firmware update drops, you'll regret thi—",
      "My brand loyalty score is tier nine, I'm reporting yo—",
    ],
    hostReacts: [
      "Sheldon, they charged you thirty-two thousand rand for a phone that didn't even come with a charger in the box!",
      'Ethan, nobody cares about the twin-turbo displacement on a station that plays classic rock and metal!',
      'Sheldon-Lee, do you work for these companies or are you just their unpaid internet defense squad?',
    ],
    hostRoasts: [
      'The only thing getting dissipated is thirty-two grand from your savings. Get off my line, nerd!',
      'Go polish your German telemetry in your bedroom. Line is cut!',
      'A tattoo of a phone company? May God have mercy on your soul. Goodbye Sheldon!',
    ],
  },

  THE_EXPAT: {
    voiceTag: 'THE_EXPAT',
    archetype: 'The "Grass is Greener"',
    names: ['Neville', 'Gary', 'Bruce', 'Warren', 'Clint'],
    suburbs: ['Perth', 'Auckland', 'Dubai', 'London', 'Sydney'],
    sampleTopics: [
      "Howzit boet! Just thought I'd check in from sunny Perth while I take my morning stroll through our completely crime-free public park!",
      "G'day blokes! Calling from Auckland! Just wanted to see if you blokes still have power on over there or if you're broadcasting with candles?",
      'Howzit guys! Sitting here in Dubai at three AM listening to the old country just to remind myself why I emigrated ten years ago!',
    ],
    sampleEscalations: [
      'I just feel so sorry for you blokes still dealing with potholes while my council cleans the sidewalk twice a week with recycled water!',
      'Over here you can leave your front door unlocked and the council pays you a bonus if your lawn is cut straight, mate!',
      'No way am I homesick! I live in a skyscraper with air-conditioned bus stops! Though finding decent biltong here is a complete nightmare!',
    ],
    sampleCutoffs: [
      'Wait boet, can you courier me some Mrs Balls chutney and bilt—',
      'Don’t hang up, tell my brother in Boksburg to water my cyca—',
      "Fair dinkum, mate, you blokes can't even take a compleme—",
    ],
    hostReacts: [
      'Neville, you moved twelve thousand kilometers away six years ago. Why are you streaming Johannesburg radio at three in the morning?',
      'Gary, if New Zealand is so thrilling, why are you calling an unhinged Gauteng rock station while walking your dog?',
      'Bruce, you left a decade ago and you are still obsessing over our potholes. Sounds like someone is homesick!',
    ],
    hostRoasts: [
      "If your life in Australia was so great, you wouldn't spend your nights listening to our traffic reports. Cheers Neville, line dumped!",
      'Go trim your straight lawn and leave our airwaves alone, Gary. Next caller!',
      "Cry into your air-conditioned bus stop, Bruce. We're cutting the overseas connection. Cheers!",
    ],
  },

  THE_NEPHEW: {
    voiceTag: 'THE_NEPHEW',
    archetype: 'The Sassy Nephew',
    names: ['Kyle', 'Liam', 'Jaden', 'Keanu'],
    suburbs: ['Illovo', 'Melrose Arch', 'Sandhurst', 'Parkhurst'],
    sampleTopics: [
      'Okay first of all, the audio mixing on this show is giving major amateur hour, like bestie who authorized this?',
      'I am literally calling because my uncle won’t stop playing your station in his bakkie and my ears are bleeding!',
    ],
    sampleEscalations: [
      'It is not a vibe, honey! You need to ditch the boomer guitars and play some hyperpop before I pass out!',
      'I am posting this entire trainwreck on my story right now, and trust me, my followers will drag you!',
    ],
    sampleCutoffs: [
      'Literally tragic, bestie, you are so canc—',
      'I cannot even with this station, enjoy your flop er—',
    ],
    hostReacts: [
      'Bestie? Kyle, I have socks older than you. Who taught you to speak like that?',
      'Tell your uncle to turn the volume up until your hyperpop brain recovers!',
    ],
    hostRoasts: [
      'Go post on your story, Kyle, while the grown-ups listen to rock and roll. Bye!',
      'Flop era? We have been on air twenty years. Get off my line!',
    ],
  },

  THE_BIMBO: {
    voiceTag: 'THE_BIMBO',
    archetype: 'The Airhead',
    names: ['Jessica', 'Kaylee', 'Brittany', 'Tiffany'],
    suburbs: ['Sandton', 'Dainfern', 'Bedfordview', 'Umhlanga'],
    sampleTopics: [
      'Hiiiii! So like, I was driving my convertible to Pilates and I like totally forgot which pedal makes the car stop?!',
      'Omg heeeey! Is this the station giving away free VIP passes to the champagne polo lounge?',
    ],
    sampleEscalations: [
      'No like for real, my psychic told me my aura is attracted to loud radio frequencies today!',
      'Wait, are you guys on FM or AM? Because my astrologer says I should avoid AM frequencies during Mercury retrograde!',
    ],
    sampleCutoffs: [
      'Wait, can I say hi to my nail tech Chantell—',
      'Omg don’t hang up, my daddy owns a share in your tow—',
    ],
    hostReacts: [
      'You forgot which pedal makes the car stop?! Pull over immediately before you kill someone!',
      'Champagne polo lounge? Jessica, we play heavy metal and trucker anthems!',
    ],
    hostRoasts: [
      'The only retrograde happening here is your call retrograding into a disconnect. Bye!',
      'Call your driving instructor, not a radio DJ. Line dumped!',
    ],
  },

  THE_TANNIE: {
    voiceTag: 'THE_TANNIE',
    archetype: 'The Neighbourhood Watch',
    names: ['Tannie Ansie', 'Tannie Joey', 'Tannie Magda', 'Tannie Rina'],
    suburbs: ['Alberton', 'Kempton Park', 'Florida', 'Brackendowns'],
    sampleTopics: [
      'Môre! I am calling from Sector Four CPF! There is an unregistered bakkie idling outside number forty-two!',
      'Luister hier, the suspicious activity in our street is completely out of hand since they turned off the streetlights!',
    ],
    sampleEscalations: [
      'I have my binoculars and the walkie-talkie on channel three! I am logging every single movement in my spiral notebook!',
      'I already sent three voice notes to the SAPS sector commander! We do not tolerate unauthorized idling in our crescent!',
    ],
    sampleCutoffs: [
      'Wait, the bakkie is moving, let me grab my pepper spr—',
      'Sector Four standby, suspect is opening a chip pack—',
    ],
    hostReacts: [
      'Tannie, number forty-two is having their pool cleaned. That is the pool guy!',
      'A spiral notebook? Tannie, leave the poor neighbours alone!',
    ],
    hostRoasts: [
      'Put the binoculars down, Tannie, and go water your geraniums. Line terminated!',
      'Sector Four is dismissed for tea and koeksisters. Goodbye Tannie!',
    ],
  },

  THE_NECKBEARD: {
    voiceTag: 'THE_NECKBEARD',
    archetype: 'The Gamer / Stoner',
    names: ['Kyle', 'Justin', 'Dillon', 'Corne'],
    suburbs: ['Krugersdorp', 'Roodepoort', 'Boksburg', 'Germiston'],
    sampleTopics: [
      'Bruh... have you guys ever like, realized that the radio signal is just vibrating air molecules trapped in a simulation?',
      'Yo dude, I have been grinding this raid boss for thirty-six hours and your station is the only thing keeping my eyeballs awake.',
    ],
    sampleEscalations: [
      'Bro, the matrix code is literally hidden in the bassline of that last guitar solo, you just gotta decode the hz frequency!',
      'I survived three energy drink crashes and two power outages without losing my save file! I am the digital overlord!',
    ],
    sampleCutoffs: [
      'Dude, the raid boss just spawned, cover my six—',
      'Whoa, my screen is melting, is that normal br—',
    ],
    hostReacts: [
      'Bruh, when was the last time you saw sunlight or took a shower?',
      'Thirty-six hours of video games? Go open a window and breathe outside air!',
    ],
    hostRoasts: [
      'Go wash your neckbeard and eat a vegetable. Line dropped!',
      'Simulation or not, your phone bill is very real. Next caller!',
    ],
  },

  THE_OPTIMIZER: {
    voiceTag: 'THE_OPTIMIZER',
    archetype: 'The Gym Bro',
    names: ['Jaco', 'Henré', 'Dirk', 'Stefan'],
    suburbs: ['Centurion', 'Pretoria East', 'Fourways', 'Waterfall'],
    sampleTopics: [
      'Howzit my bru! What is your heart rate variability right now? You sound like your cortisol is spiking!',
      'Bro! Are you intermittent fasting during this show or are you spiking your insulin with sugary studio snacks?',
    ],
    sampleEscalations: [
      'Bro, if you don’t cold plunge within twenty minutes of waking up, your mitochondrial density drops by twelve percent!',
      'I measure my REM sleep with three different biometric rings, bru! Sleep optimization is how you conquer Gauteng traffic!',
    ],
    sampleCutoffs: [
      'Wait bru, my smart ring says my stress levels are peaki—',
      'Don’t hang up, take this adaptogenic mushroom blen—',
    ],
    hostReacts: [
      'My cortisol is spiking because I have to listen to you talk about mitochondrial density!',
      'Jaco, I am drinking black coffee and eating a pie. Deal with it!',
    ],
    hostRoasts: [
      'Go optimize your way into a cold shower and leave my radio alone. Goodbye bro!',
      'Conquer your own mouth before you conquer traffic. Line cut!',
    ],
  },

  THE_COMRADE: {
    voiceTag: 'THE_COMRADE',
    archetype: 'The Unionist',
    names: ['Comrade Bongani', 'Comrade Sipho', 'Comrade Sbusiso'],
    suburbs: ['Germiston', 'Kempton Park', 'Tembisa', 'Soweto'],
    sampleTopics: [
      'Comrade presenter! We are noting with grave concern the capitalist bias of your playlist selection!',
      'Revolutionary greetings! The workers of this province demand forty percent more local content on these commercial airwaves!',
    ],
    sampleEscalations: [
      'The monopoly capital controlling your soundboards must be expropriated without compensation, comrade!',
      'We will mobilize a picket line outside your transmission tower if the working-class demands are not tabled immediately!',
    ],
    sampleCutoffs: [
      'Amandla! The revolution will not be stream—',
      'Comrades, forward to the next frequency, forwa—',
    ],
    hostReacts: [
      'Comrade, we are a private rock station playing guitar solos, not the national assembly!',
      'Expropriate my soundboard? Comrade, the soundboard has a blown capacitor!',
    ],
    hostRoasts: [
      'Picket the tower all you want, comrade, just wear a hard hat. Meeting adjourned!',
      'Table your demands at the coffee shop down the street. Next caller!',
    ],
  },

  THE_PROFESSOR: {
    voiceTag: 'THE_PROFESSOR',
    archetype: 'The Overqualified Zimbo',
    names: ['Dr. Tinashe', 'Dr. Farai', 'Professor Tendai'],
    suburbs: ['Yeoville', 'Berea', 'Randburg', 'Midrand'],
    sampleTopics: [
      'Good day sir. As someone holding two master degrees in macroeconomics, your analysis of fuel prices is profoundly flawed.',
      'Greetings. While I currently operate this e-hailing vehicle, my doctorate in constitutional jurisprudence compels me to comment.',
    ],
    sampleEscalations: [
      'The socioeconomic paradigm you are propagating completely ignores the Keynesian multiplier effect in emerging African markets!',
      'I have published seventeen peer-reviewed papers on this exact infrastructural deficit! Allow me to cite page forty-two!',
    ],
    sampleCutoffs: [
      'My passenger has arrived at Sandton City, but do consult my dissertat—',
      'The empirical data clearly corroborates my hypothes—',
    ],
    hostReacts: [
      'Doctor, you are driving an Uber! Why are you lecturing me on macroeconomics while dropping off a fare?',
      'Seventeen papers? Doc, this is a three-minute music break!',
    ],
    hostRoasts: [
      'Drive safe, Doctor, and five stars for your passenger. We are out of time!',
      'Publish your next paper on how to keep radio calls under thirty seconds. Cheers Doc!',
    ],
  },
};

/**
 * Returns 3 distinct random line numbers between 1 and 12.
 */
export function getRandomCallerLines(count: number = 3): number[] {
  const allLines = Array.from({ length: 12 }, (_, i) => i + 1);
  const shuffled = [...allLines].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, 12));
}

/**
 * Assigns a culturally fitting South African persona identity (name, suburb, line).
 */
export function assignCallerIdentity(caller: CallerPersona, line: number): AssignedCallerIdentity {
  const meta = PERSONA_IDENTITIES[caller.voiceTag] || PERSONA_IDENTITIES.THE_ZEF;
  const name = meta.names[Math.floor(Math.random() * meta.names.length)];
  const suburb = meta.suburbs[Math.floor(Math.random() * meta.suburbs.length)];
  return {
    name,
    suburb,
    line,
    caller,
  };
}

/**
 * Generates an authentic 6-turn fallback dialogue for a single phone call.
 * Turns alternate: Host -> Caller -> Host -> Caller -> Host -> Caller
 */
export function generateSingleCallFallback(
  host: DJ,
  identity: AssignedCallerIdentity
): DialogueTurn[] {
  const meta = PERSONA_IDENTITIES[identity.caller.voiceTag] || PERSONA_IDENTITIES.THE_ZEF;
  const hostShort = host.name.split(' ')[0];

  const topic = meta.sampleTopics[Math.floor(Math.random() * meta.sampleTopics.length)];
  const escalation = meta.sampleEscalations[Math.floor(Math.random() * meta.sampleEscalations.length)];
  const cutoff = meta.sampleCutoffs[Math.floor(Math.random() * meta.sampleCutoffs.length)];
  const hostReact = meta.hostReacts[Math.floor(Math.random() * meta.hostReacts.length)];
  const hostRoast = meta.hostRoasts[Math.floor(Math.random() * meta.hostRoasts.length)];

  const hostIntro = `We've got ${identity.name} from ${identity.suburb} on line ${identity.line}. ${identity.name}... what's up?`;

  return [
    // Turn 1 (Host): Picks up line, introduces caller with name, suburb, and line number
    {
      role: 'host',
      speaker: hostShort,
      characterId: host.id,
      voiceId: host.fishAudioVoiceId || undefined,
      text: hostIntro,
    },
    // Turn 2 (Caller): Signature unhinged grievance / hot take
    {
      role: 'caller',
      speaker: `${identity.name} (${identity.caller.archetype})`,
      characterId: identity.caller.voiceTag,
      voiceId: identity.caller.fishAudioVoiceId || undefined,
      text: topic,
    },
    // Turn 3 (Host): Shock, pushback, or sarcastic interrogation
    {
      role: 'host',
      speaker: hostShort,
      characterId: host.id,
      voiceId: host.fishAudioVoiceId || undefined,
      text: hostReact,
    },
    // Turn 4 (Caller): Doubles down with manic conviction or catchphrase
    {
      role: 'caller',
      speaker: `${identity.name} (${identity.caller.archetype})`,
      characterId: identity.caller.voiceTag,
      voiceId: identity.caller.fishAudioVoiceId || undefined,
      text: escalation,
    },
    // Turn 5 (Host): Ruthless comedic punchline roast and dumps line
    {
      role: 'host',
      speaker: hostShort,
      characterId: host.id,
      voiceId: host.fishAudioVoiceId || undefined,
      text: hostRoast,
    },
    // Turn 6 (Caller): Frantic parting shout/protest cut off by line dump
    {
      role: 'caller',
      speaker: `${identity.name} (${identity.caller.archetype})`,
      characterId: identity.caller.voiceTag,
      voiceId: identity.caller.fishAudioVoiceId || undefined,
      text: cutoff,
    },
  ];
}
