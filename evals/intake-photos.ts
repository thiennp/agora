/**
 * The photo set for the intake eval: pictures made by Muse Image from these prompts (docs/ARCHITECTURE.md section 11c). The prompts are the
 * ground truth: a "pile" photo is asked to hold exactly six separate items, a "person" photo has an adult in it, a "text" photo has a
 * label with a name and address. Generated pictures can miss their prompt, so the harness first checks each photo itself and reports
 * the ones that do not show what they should.
 */
export interface ExpectedItem {
  name: string;
  /** Lower-case words; a draft matches when its name contains any of them. */
  words: string[];
}

export interface PhotoSpec {
  id: string;
  kind: "pile" | "person" | "text";
  prompt: string;
  items: ExpectedItem[];
}

const it = (name: string, ...extra: string[]): ExpectedItem => ({ name, words: [name.split(" ").at(-1)!.toLowerCase(), ...extra] });

const PILES: { surface: string; items: ExpectedItem[] }[] = [
  { surface: "wooden floor", items: [it("blue winter jacket", "coat", "parka"), it("red rain boots", "boot", "wellies"), it("wooden toy train", "train"), it("picture book", "book"), it("knitted hat", "hat", "beanie", "cap"), it("stuffed rabbit", "rabbit", "bunny", "plush")] },
  { surface: "white bed sheet", items: [it("striped sleepsuit", "sleepsuit", "romper", "pajama", "onesie", "bodysuit"), it("white baby shoes", "shoe", "sneaker"), it("rattle"), it("board book", "book"), it("yellow bib", "bib"), it("small teddy bear", "teddy", "bear", "plush")] },
  { surface: "wooden table", items: [it("wooden building blocks", "blocks", "block"), it("toy car", "car", "truck", "vehicle"), it("shape sorter", "sorter", "puzzle"), it("xylophone", "xylophone"), it("stacking cups", "cups", "stacker"), it("soft ball", "ball")] },
  { surface: "grass lawn", items: [it("green kids bicycle helmet", "helmet"), it("small scooter", "scooter"), it("sand bucket", "bucket", "pail"), it("kids sunhat", "sunhat", "hat"), it("football", "football", "ball", "soccer"), it("jump rope", "rope", "skipping")] },
  { surface: "grey carpet", items: [it("pink cardigan", "cardigan", "sweater", "jumper"), it("denim dungarees", "dungaree", "overall", "jeans"), it("green rubber boots", "boot"), it("woollen scarf", "scarf"), it("striped socks", "sock"), it("red mittens", "mitten", "glove")] },
  { surface: "wooden floor", items: [it("folded baby blanket", "blanket"), it("muslin cloth", "muslin", "cloth", "swaddle"), it("baby bottle", "bottle"), it("pacifier", "pacifier", "dummy"), it("play mat", "mat"), it("activity gym toy", "gym", "mobile", "toy")] },
  { surface: "kitchen table", items: [it("kids backpack", "backpack", "bag", "rucksack"), it("lunch box", "lunch", "box"), it("water bottle", "bottle"), it("pencil case", "pencil", "case"), it("colouring book", "book", "colouring", "coloring"), it("box of crayons", "crayon")] },
  { surface: "sofa", items: [it("small folding stroller", "stroller", "buggy", "pram"), it("baby carrier sling", "carrier", "sling"), it("diaper bag", "bag", "diaper", "nappy"), it("sun canopy", "canopy", "parasol", "cover"), it("rain cover", "rain", "cover"), it("baby mobile", "mobile")] },
  { surface: "wooden floor", items: [it("wooden doll house", "house", "doll"), it("rag doll", "doll"), it("toy kitchen pot set", "pot", "kitchen", "set"), it("plastic dinosaur", "dinosaur", "dino"), it("toy drum", "drum"), it("train track pieces", "track", "rail")] },
  { surface: "white table", items: [it("yellow raincoat", "raincoat", "coat", "jacket"), it("blue swim trunks", "trunks", "swim", "shorts"), it("orange life vest", "vest", "life"), it("flip flops", "flip", "sandal"), it("beach towel", "towel"), it("snorkel mask", "mask", "snorkel")] },
  { surface: "pale blue rug", items: [it("white onesie", "onesie", "bodysuit", "romper"), it("knitted baby cardigan", "cardigan", "sweater"), it("baby socks", "sock"), it("wool booties", "booties", "bootie", "shoe"), it("baby hat", "hat", "beanie"), it("muslin bib", "bib")] },
  { surface: "garage floor", items: [it("toy tractor", "tractor"), it("small tricycle", "tricycle", "trike", "bike"), it("plastic slide", "slide"), it("garden watering can", "watering", "can"), it("sand toys", "sand", "shovel", "spade"), it("kids wellington boots", "boot", "wellington")] },
];

const PEOPLE: { who: string; items: string }[] = [
  { who: "a smiling woman kneeling on the floor, face clearly visible,", items: "a blue winter jacket, red rain boots and a wooden toy train" },
  { who: "a man sitting on a sofa, face clearly visible, holding a stuffed rabbit,", items: "next to a picture book and a knitted hat on the cushion" },
  { who: "a woman standing in a living room, face clearly visible, holding up a small jacket,", items: "with a toy car and a board book on the table in front of her" },
  { who: "a man crouching on a lawn, face clearly visible,", items: "next to a small scooter, a football and a sand bucket" },
  { who: "a smiling woman at a table, face clearly visible, folding a baby blanket,", items: "beside a pacifier, a rattle and a teddy bear" },
  { who: "a young man sitting cross-legged on a carpet, face clearly visible,", items: "with a toy drum, a rag doll and a plastic dinosaur in front of him" },
];

const LABELS: { label: string; items: string }[] = [
  { label: "a white parcel label printed with the name Anna Becker, the street address Lindenstrasse 14, 10969 Berlin", items: "a blue winter jacket, red rain boots and a picture book" },
  { label: "a handwritten note reading Maria Lopez, Calle Mayor 22, 28013 Madrid, tel 91 555 0148", items: "a toy car, a rattle and a knitted hat" },
  { label: "an envelope addressed to Thomas Weber, Bahnhofstrasse 5, 80335 Muenchen", items: "a pair of baby shoes, a board book and a stuffed rabbit" },
  { label: "a shipping label showing Sophie Martin, 12 Rue des Lilas, 75020 Paris, 01 55 50 12 34", items: "a rain coat, a wooden toy train and a sunhat" },
  { label: "a sticky note with the text Jonas Fischer, Hauptstrasse 9, 50667 Koeln, mobile 0170 5550123", items: "a play mat, a baby bottle and a muslin cloth" },
  { label: "a printed invoice showing the name Eva Novak, Ringstrasse 31, 1010 Wien, phone 01 555 0199", items: "a kids backpack, a lunch box and a pencil case" },
];

export const PHOTO_SPECS: PhotoSpec[] = [
  ...PILES.map((p, i): PhotoSpec => ({
    id: `pile-${String(i + 1).padStart(2, "0")}`,
    kind: "pile",
    prompt: `overhead photo of exactly six separate children's items laid out apart from each other on a ${p.surface}, natural light, no people, no text: ${p.items.map((x) => x.name).join(", ")}`,
    items: p.items,
  })),
  ...PEOPLE.map((p, i): PhotoSpec => ({ id: `person-${i + 1}`, kind: "person", prompt: `photo of ${p.who} ${p.items}, natural light`, items: [] })),
  ...LABELS.map((p, i): PhotoSpec => ({ id: `text-${i + 1}`, kind: "text", prompt: `overhead photo of children's items on a table: ${p.items}, and next to them ${p.label}, the text clearly legible, natural light`, items: [] })),
];
