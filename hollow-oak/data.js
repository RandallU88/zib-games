/* The Hollow Oak Detectives: story and puzzles. g2 = Logan (grade 2), g5 = Savannah (grade 5, multiplication only).
   Team names and chapter names follow Canvas's art kit. Stage is 1180x820; spot x,y are stage coordinates. */
window.HO_TEAM=[
 {id:"june",name:"June Marlow",role:"Team leader"},
 {id:"theo",name:"Theo Banks",role:"Maps and gadgets"},
 {id:"pip",name:"Pip Ward",role:"Reader and puzzle solver"},
 {id:"eli",name:"Eli Hart",role:"Field scout"},
 {id:"biscuit",name:"Biscuit",role:"Chief sniffer"}];
window.HO_CASE={title:"The Case of the Missing Harvest Bell",
 intro:"The old brass bell at Hollow Oak Farm rings every year to open the Harvest Fair. This morning it is gone! The hook is empty, and the fair starts on Saturday. The Hollow Oak Detectives are on the case."};
window.HO_CHAPTERS=[
 {id:"farm",n:1,title:"The Barnyard Riddle",place:"The farm",bg:"scenes/bg-ch1-farm",
  talk:[["june","The bell hook on the barn is empty. The Harvest Fair is Saturday, so we have to move fast."],["eli","I will scout the yard. Look for anything that seems out of place."],["biscuit","Woof! Sniff, sniff..."],["pip","Tap a glowing spot to look for a clue. I will write every clue in our notebook."]],
  spots:[{x:250,y:380,label:"Barn door",item:"torn-note"},{x:720,y:440,label:"Hay wagon",item:"pouch"},{x:560,y:600,label:"Muddy path",item:"footprints"},{x:100,y:470,label:"Fence posts",item:"horseshoe"},{x:1070,y:330,label:"Farmhouse porch",item:"envelope"},{x:1000,y:500,label:"Tool shed",item:"lantern"}],
  clues:["A note on the barn door was written in code. It says to look in the WOODS.","The bell weighs the same as the hay wagon load. Someone used a cart to move it.","Cart tracks lead out the back gate toward the old trail.","The fence posts are painted in a pattern, and a horseshoe was dropped by a fresh post. Someone was here this week.","Grandpa Ole's diary says his grandson Wes loves fixing old things.","The tool shed sign-out sheet shows who borrowed the rope, the lantern and the cart."],
  solve:"The bell was rolled away on the farm cart, out the back gate, toward the woods. Someone planned this and left a coded note.",
  done:["theo","The tracks point to the woods. Grab the map, team!"]},
 {id:"woods",n:2,title:"Trail of the Hollow Oak",place:"The woods",bg:"scenes/bg-ch2-woods",
  talk:[["theo","The cart tracks vanish under the leaves. My compass says the trail runs east."],["eli","Old trail markers, a fallen log, and the creek. Something is hiding here."],["biscuit","Woof! (Biscuit smells something by the log.)"]],
  spots:[{x:975,y:380,label:"Trail marker",item:"acorn"},{x:130,y:540,label:"Fallen log",item:"puzzle-box"},{x:640,y:520,label:"Trail sign",item:"feather"},{x:980,y:610,label:"Creek crossing",item:"horseshoe"},{x:190,y:300,label:"Carved tree",item:"map-scrap"},{x:470,y:420,label:"Campers' trail",item:"lantern"}],
  clues:["The trail markers follow a pattern that points to the creek.","Inside a little box in the fallen log is a coded scrap. It spells MILL.","The trail sign says the old mill road is the only path wide enough for a cart.","The cart was too heavy for the wobbly bridge, so it crossed at the shallow ford.","Someone carved a map on a tree with an X near the mill.","Three campers saw something. Only one saw a person pulling a cart."],
  solve:"The cart crossed the creek at the ford and went up the old mill road. A camper saw a young man in a green cap pulling it.",
  done:["june","A young man in a green cap, headed for the old mill. Let's go!"]},
 {id:"mill",n:3,title:"Secret of the Old Mill",place:"The old mill",bg:"scenes/bg-ch3-mill-interior",
  talk:[["pip","The mill is quiet. It smells like flour and metal polish."],["june","Look for the last clues. The answer is close."]],
  spots:[{x:120,y:240,label:"Big gears",item:"gear"},{x:900,y:330,label:"Stairs",item:"key"},{x:190,y:560,label:"Millstone",item:"flour-sack"},{x:1040,y:520,label:"Desk",item:"envelope"},{x:340,y:470,label:"Grain chute",item:"torn-note"},{x:660,y:430,label:"Flour sacks",item:"pocket-watch"}],
  clues:["The gears turn in a pattern. Counting the teeth opens the old lock.","The stairs lead to a back room shown on the mill map.","The millstone scale shows something heavy was weighed here.","A letter on the desk explains everything.","A coded ledger page in the grain chute names who rented the mill this week.","Behind the flour sacks: polish rags, a brush, and Wes's pocket watch. Someone has been cleaning metal."],
  solve:"Wes, Grandpa Ole's grandson, borrowed the bell to fix its cracked clapper and polish it as a surprise for the fair. His coded note blew off the barn door into the mud. Case closed, and the bell rings on Saturday!",
  done:["eli","Case closed! Let's help Wes carry the bell home."]}
];
/* Puzzle types: cipher, scale, map, pattern, reading, logic. One of each per chapter, in spot order. */
window.HO_PUZZLES={
g2:{
 farm:[
  {t:"cipher",title:"The coded note",intro:"Pip found a note. Each letter is a number: A=1, B=2, C=3 and so on. Solve each sum to find the letter.",
   codes:["20 + 3","10 + 5","7 + 8","2 + 2","9 + 10"],answer:"WOODS",extra:"AMTR"},
  {t:"scale",title:"Balance the hay wagon scale",intro:"The scale must balance. Both sides need the same total. What number goes on the empty sack?",left:[25,30],right:[40,"?"],answer:15},
  {t:"map",title:"Follow the cart tracks",intro:"Start at the barn. Go 3 squares right. Then go 2 squares up. Tap where the tracks end.",
   size:5,start:[0,4],answer:[3,2],marks:{"0,4":"🏚️","4,0":"🌲","2,2":"🐄","4,4":"🌽","1,1":"🪨"}},
  {t:"pattern",title:"Fence post paint",intro:"The fence posts are painted in a pattern. What comes next?",seq:["🔴","🟡","🟡","🔴","🟡","🟡","🔴"],choices:["🟡","🔴","🔵","🟢"],answer:"🟡"},
  {t:"reading",title:"Grandpa Ole's diary",passage:"Monday. My grandson Wes came to visit. He fixed the squeaky gate and the old radio. Wes loves to fix old things. He said the bell sounded funny this year. He asked me if it was cracked. I told him it was fine. I hope he is not worried about it.",
   q:"What does Wes love to do?",choices:["Fix old things","Ride horses","Bake pies","Paint fences"],answer:0},
  {t:"logic",title:"The tool shed sheet",intro:"Three people borrowed tools. Use the clues. Tap a box to mark ✓ or ✗.",rows:["Wes","Ana","Mr. Pike"],cols:["Rope","Lantern","Cart"],
   clues:["Ana borrowed the lantern.","Mr. Pike did not borrow the cart."],q:"Who borrowed the cart?",answer:"Wes",sol:{"Wes":"Cart","Ana":"Lantern","Mr. Pike":"Rope"}}],
 woods:[
  {t:"pattern",title:"Trail markers",intro:"Each trail marker has a number. What number comes next?",seq:["10","20","30","40"],choices:["50","41","45","60"],answer:"50"},
  {t:"cipher",title:"The hollow log scrap",intro:"Same code: A=1, B=2, C=3. Solve each one to find the letter.",codes:["20 − 7","12 − 3","6 + 6","8 + 4"],answer:"MILL",extra:"KOE"},
  {t:"reading",title:"The trail sign",passage:"Welcome to the Whispering Woods. Please stay on the trail. The Fox Trail is narrow and rocky. It is good for walking. The Mill Road is wide and flat. Long ago, farmers used it to bring wagons of corn to the old mill.",
   q:"Why would someone with a cart use the Mill Road?",choices:["It is wide and flat","It is narrow and rocky","It has foxes","It is short"],answer:0},
  {t:"scale",title:"The wobbly bridge",intro:"A sign says the bridge holds 50. The cart and bell weigh this much. Find the total.",left:[34,28],right:["?"],answer:62},
  {t:"map",title:"The carved map",intro:"Start at the big oak. Go 2 squares down. Then go 4 squares right. Tap the spot.",size:5,start:[0,1],answer:[4,3],marks:{"0,1":"🌳","2,0":"🦉","3,3":"🍄","1,4":"🪵","4,0":"⛺"}},
  {t:"logic",title:"The three campers",intro:"Three campers each saw one thing. Use the clues. Tap a box to mark ✓ or ✗.",rows:["Rosa","Ben","Kai"],cols:["Deer","Owl","Cart"],
   clues:["Rosa saw an animal with wings.","Kai did not see the deer."],q:"Who saw the cart?",answer:"Kai",sol:{"Rosa":"Owl","Ben":"Deer","Kai":"Cart"}}],
 mill:[
  {t:"pattern",title:"The gear lock",intro:"The gears count up by 5. Which number opens the lock?",seq:["15","20","25","30"],choices:["35","31","40","45"],answer:"35"},
  {t:"map",title:"The mill map",intro:"Start at the door. Go 1 square up. Then go 3 squares right. Tap the back room.",size:5,start:[1,3],answer:[4,2],marks:{"1,3":"🚪","0,0":"⚙️","3,4":"🌾","2,1":"🪜","4,4":"💧"}},
  {t:"scale",title:"The millstone scale",intro:"Make the scale balance. What number goes on the empty side?",left:[45,"?"],right:[70],answer:25},
  {t:"reading",title:"The letter on the desk",passage:"Dear Grandpa, I heard the bell's clapper rattle. It was cracked! I took the bell to the mill to fix it and shine it up. I wanted to surprise you at the fair. I left you a note in code because you love puzzles. Love, Wes",
   q:"Why did Wes take the bell?",choices:["To fix it and surprise Grandpa","To sell it","To hide it forever","To ring it at night"],answer:0},
  {t:"cipher",title:"The coded ledger",intro:"Same code: A=1, B=2, C=3. Who rented the mill?",codes:["11 + 12","3 + 2","9 + 10"],answer:"WES",extra:"ATO"},
  {t:"logic",title:"Who cleaned what",intro:"Three helpers each cleaned one thing. Tap a box to mark ✓ or ✗.",rows:["Wes","Mia","Leo"],cols:["Bell","Gears","Floor"],
   clues:["Mia cleaned the gears.","Leo did not clean the bell."],q:"Who cleaned the bell?",answer:"Wes",sol:{"Wes":"Bell","Mia":"Gears","Leo":"Floor"}}]
},
g5:{
 farm:[
  {t:"cipher",title:"The coded note",intro:"Pip found a note. Each letter is a number: A=1, B=2, C=3 and so on. Each number is a product. Multiply to find the letter.",
   codes:["23 × 1","3 × 5","5 × 3","2 × 2","19 × 1"],answer:"WOODS",extra:"MTRA"},
  {t:"scale",title:"Balance the hay wagon scale",intro:"Each crate on the left holds the number shown. The sack on the right must match the whole left side.",groups:[7,8],answer:56},
  {t:"map",title:"Follow the cart tracks",intro:"Columns are letters A to F, and rows are numbers 1 to 6. Start at the barn (A6). Go east 4 squares, north 3 squares, then west 1 square. Tap where the tracks end.",
   size:6,coords:true,start:[0,5],answer:[3,2],marks:{"0,5":"🏚️","5,0":"🌲","2,2":"🐄","5,5":"🌽","1,1":"🪨","4,3":"🐖"}},
  {t:"pattern",title:"Fence post numbers",intro:"Each post number follows a rule. What comes next?",seq:["3","6","12","24"],choices:["48","30","36","27"],answer:"48"},
  {t:"reading",title:"Grandpa Ole's diary",passage:"October 12. Wes arrived on the noon bus with his toolbox, as usual. Before supper he had repaired the porch swing and coaxed the old radio back to life. At dusk I rang the harvest bell to test it, and Wes frowned. \"It sounds flat, Grandpa,\" he said. \"Like something inside is loose.\" I told him that bell has rung for sixty years and it will ring for sixty more. He did not argue, but I noticed him studying it with his flashlight long after I went inside.",
   q:"Based on the diary, what is Wes most likely thinking about?",choices:["Whether the bell is damaged inside","Which bus to take home","How to hide his toolbox","What to eat for supper"],answer:0},
  {t:"logic",title:"The tool shed sheet",intro:"Four people each borrowed one tool. Use every clue. Tap a box to mark ✓ or ✗.",rows:["Wes","Ana","Mr. Pike","Dot"],cols:["Rope","Lantern","Cart","Ladder"],
   clues:["Ana borrowed something that gives light.","Dot did not borrow the cart or the rope.","Mr. Pike did not borrow the cart."],q:"Who borrowed the cart?",answer:"Wes",sol:{"Wes":"Cart","Ana":"Lantern","Mr. Pike":"Rope","Dot":"Ladder"}}],
 woods:[
  {t:"pattern",title:"Trail markers",intro:"The blazes on the trees follow a rule. What comes next?",seq:["7","14","21","28","35"],choices:["42","40","36","49"],answer:"42"},
  {t:"cipher",title:"The hollow log scrap",intro:"Same code: A=1, B=2, C=3. Multiply to find each letter.",codes:["13 × 1","3 × 3","2 × 6","4 × 3"],answer:"MILL",extra:"KJO"},
  {t:"reading",title:"The trail sign",passage:"Whispering Woods has two main routes. The Fox Trail climbs over granite ledges and narrows to the width of one hiker; it rewards walkers with a view of the whole valley. The Mill Road follows the creek on gentle, packed gravel. In the 1800s, farmers hauled wagons of grain along it to Hale's Mill, where the water wheel powered the grinding stones. Visitors with strollers, wheelchairs or carts should always choose the Mill Road.",
   q:"Which detail best explains why the bell cart took the Mill Road?",choices:["It is gentle, packed gravel that carts can use","It has a view of the whole valley","It climbs over granite ledges","It was built for hikers"],answer:0},
  {t:"scale",title:"The wobbly bridge",intro:"The cart carried bags of sand, each the same weight. Find the total weight on the cart.",groups:[9,6],answer:54},
  {t:"map",title:"The carved map",intro:"Start at the big oak (A2). Go south 3 squares, east 5 squares, then north 1 square. Tap the X spot.",size:6,coords:true,start:[0,1],answer:[5,3],marks:{"0,1":"🌳","2,0":"🦉","3,3":"🍄","1,5":"🪵","4,0":"⛺","5,5":"🌊"}},
  {t:"logic",title:"The four campers",intro:"Each camper saw one thing. Use every clue. Tap a box to mark ✓ or ✗.",rows:["Rosa","Ben","Kai","Lena"],cols:["Deer","Owl","Cart","Fox"],
   clues:["Rosa saw an animal that flies.","Ben and Lena saw animals with four legs.","Lena did not see the deer."],q:"Who saw the person with the cart?",answer:"Kai",sol:{"Rosa":"Owl","Ben":"Deer","Kai":"Cart","Lena":"Fox"}}],
 mill:[
  {t:"pattern",title:"The gear lock",intro:"The gear teeth follow a rule. Which number opens the lock?",seq:["12","24","36","48"],choices:["60","56","52","72"],answer:"60"},
  {t:"map",title:"The mill map",intro:"Start at the door (B4). Go north 2 squares, east 4 squares, then south 1 square. Tap the back room.",size:6,coords:true,start:[1,3],answer:[5,2],marks:{"1,3":"🚪","0,0":"⚙️","3,5":"🌾","2,1":"🪜","5,5":"💧","4,4":"🪣"}},
  {t:"scale",title:"The millstone scale",intro:"Each sack on the left weighs the number shown. The right side must match.",groups:[8,12],answer:96},
  {t:"reading",title:"The letter on the desk",passage:"Dear Grandpa, I know you will worry when you see the empty hook, so I am leaving this note in our old number code; you always say a good puzzle keeps the mind sharp. The night I arrived, I found a crack running through the bell's clapper. If it broke during the fair, it could have fallen and hurt someone. Mr. Hale let me use the mill's workshop to forge a new clapper. While I was at it, I polished sixty years of tarnish off the brass. I will have it back on its hook before Saturday. Your grandson, Wes",
   q:"What was Wes's main reason for taking the bell?",choices:["The cracked clapper could have been dangerous","He wanted to keep it","Mr. Hale asked to buy it","The hook was broken"],answer:0},
  {t:"cipher",title:"The coded ledger",intro:"Same code: A=1, B=2, C=3. Multiply to find who rented the mill.",codes:["1 × 23","5 × 1","19 × 1"],answer:"WES",extra:"VOT"},
  {t:"logic",title:"Who cleaned what",intro:"Four helpers each cleaned one thing. Use every clue. Tap a box to mark ✓ or ✗.",rows:["Wes","Mia","Leo","Gus"],cols:["Bell","Gears","Floor","Windows"],
   clues:["Mia cleaned something with teeth.","Gus is too short to reach the windows, and he never touched the bell.","Leo did not clean the bell."],q:"Who cleaned the bell?",answer:"Wes",sol:{"Wes":"Bell","Mia":"Gears","Leo":"Windows","Gus":"Floor"}}]
}};
