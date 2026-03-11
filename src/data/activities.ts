import type { RegionQuest } from "@/types";

export interface Activity extends RegionQuest {
  estimatedEntryPrice: number;
  regionId: string;
}

export const ACTIVITIES: Activity[] = [
  // Bayern
  { id: "act-europapark", title: "Europa-Park", description: "Germany's largest theme park in Rust with over 100 rides and 18 themed areas. A full day of adrenaline.", category: "activity", lat: 48.2660, lng: 7.7219, xp: 90, estimatedEntryPrice: 55, regionId: "baden-wuerttemberg" },
  { id: "act-bayern-park", title: "Bayern Park", description: "Family-friendly amusement park in Reisbach with roller coasters, a log flume, and a wildlife park.", category: "activity", lat: 48.5696, lng: 12.6897, xp: 70, estimatedEntryPrice: 35, regionId: "bayern" },
  { id: "act-phantasialand", title: "Phantasialand", description: "Award-winning theme park near Cologne with immersive theming and world-class coasters like Taron and F.L.Y.", category: "activity", lat: 50.7989, lng: 6.8794, xp: 90, estimatedEntryPrice: 55, regionId: "nordrhein-westfalen" },
  { id: "act-legoland", title: "Legoland Deutschland", description: "Everything is awesome at this park in Guenzburg. Over 55 rides and millions of LEGO bricks.", category: "activity", lat: 48.4314, lng: 10.2971, xp: 75, estimatedEntryPrice: 50, regionId: "bayern" },
  { id: "act-therme-erding", title: "Therme Erding", description: "The world's largest spa complex near Munich. Water slides, wave pools, saunas, and relaxation areas.", category: "activity", lat: 48.2938, lng: 11.9128, xp: 65, estimatedEntryPrice: 30, regionId: "bayern" },
  { id: "act-airhop-munich", title: "AirHop Trampolinpark Munich", description: "Huge indoor trampoline park with ninja courses, foam pits, and dodgeball. Fun for all ages.", category: "activity", lat: 48.1780, lng: 11.5990, xp: 45, estimatedEntryPrice: 15, regionId: "bayern" },
  { id: "act-miniatur-wunderland", title: "Miniatur Wunderland", description: "The world's largest model railway in Hamburg. Incredibly detailed miniature worlds over 1,500 sqm.", category: "activity", lat: 53.5437, lng: 9.9886, xp: 80, estimatedEntryPrice: 20, regionId: "hamburg" },
  { id: "act-zoo-leipzig", title: "Zoo Leipzig", description: "One of Europe's best zoos with Gondwanaland tropical hall. Home to over 850 species.", category: "activity", lat: 51.3506, lng: 12.3708, xp: 65, estimatedEntryPrice: 22, regionId: "sachsen" },
  { id: "act-tropical-islands", title: "Tropical Islands", description: "A tropical waterpark inside a former airship hangar near Berlin. The dome is 360m long.", category: "activity", lat: 52.0383, lng: 13.7570, xp: 70, estimatedEntryPrice: 45, regionId: "brandenburg" },
  { id: "act-heide-park", title: "Heide Park Resort", description: "Major theme park in Soltau with Germany's tallest coaster Colossos and the inverted Big Loop.", category: "activity", lat: 53.0257, lng: 9.8786, xp: 80, estimatedEntryPrice: 50, regionId: "niedersachsen" },
  { id: "act-movie-park", title: "Movie Park Germany", description: "Hollywood-themed park in Bottrop with movie rides, stunt shows, and themed areas.", category: "activity", lat: 51.6279, lng: 6.9729, xp: 70, estimatedEntryPrice: 45, regionId: "nordrhein-westfalen" },
  { id: "act-hansa-park", title: "Hansa-Park", description: "Theme park right on the Baltic Sea coast near Luebeck. Unique seaside coasters.", category: "activity", lat: 54.0747, lng: 10.7842, xp: 70, estimatedEntryPrice: 43, regionId: "schleswig-holstein" },
  { id: "act-climb-up", title: "Kletterwald Munich", description: "High ropes adventure park in the trees near Munich. Multiple difficulty courses.", category: "activity", lat: 48.0926, lng: 11.4460, xp: 50, estimatedEntryPrice: 25, regionId: "bayern" },
  { id: "act-badewelt-sinsheim", title: "Badewelt Sinsheim", description: "Huge tropical water park with palm trees and the Caribbean flair in Baden-Wuerttemberg.", category: "activity", lat: 49.2502, lng: 8.8789, xp: 55, estimatedEntryPrice: 28, regionId: "baden-wuerttemberg" },
  { id: "act-zoo-berlin", title: "Zoo Berlin", description: "Germany's oldest zoo with the iconic Elephant Gate. Over 20,000 animals and an aquarium.", category: "activity", lat: 52.5079, lng: 13.3376, xp: 65, estimatedEntryPrice: 22, regionId: "berlin" },
  { id: "act-technik-museum", title: "Technik Museum Sinsheim", description: "Incredible collection with a Concorde and a Tupolev on the roof. Cars, trains, and space exhibits.", category: "activity", lat: 49.2390, lng: 8.8970, xp: 70, estimatedEntryPrice: 19, regionId: "baden-wuerttemberg" },
  { id: "act-hagenbeck", title: "Tierpark Hagenbeck", description: "Hamburg's beloved zoo with open enclosures and a tropical aquarium.", category: "activity", lat: 53.5936, lng: 9.9430, xp: 60, estimatedEntryPrice: 25, regionId: "hamburg" },
  { id: "act-erlebnispark-tripsdrill", title: "Erlebnispark Tripsdrill", description: "Swabian theme park near Stuttgart with charming rides, a wildlife park, and overnight treehouses.", category: "activity", lat: 49.0317, lng: 9.0603, xp: 70, estimatedEntryPrice: 40, regionId: "baden-wuerttemberg" },
  { id: "act-karl-may-festspiele", title: "Karl-May-Festspiele Bad Segeberg", description: "Open-air Wild West shows at the iconic limestone cliff theater. A German summer tradition.", category: "activity", lat: 53.9347, lng: 10.3107, xp: 55, estimatedEntryPrice: 30, regionId: "schleswig-holstein" },
  { id: "act-serengeti-park", title: "Serengeti-Park Hodenhagen", description: "Drive-through safari park with over 1,500 wild animals plus amusement rides.", category: "activity", lat: 52.7324, lng: 9.5873, xp: 75, estimatedEntryPrice: 43, regionId: "niedersachsen" },
  { id: "act-ravensburger", title: "Ravensburger Spieleland", description: "Family park themed around Ravensburger board games and puzzles near Lake Constance.", category: "activity", lat: 47.7340, lng: 9.5820, xp: 60, estimatedEntryPrice: 40, regionId: "baden-wuerttemberg" },
  { id: "act-autostadt", title: "Autostadt Wolfsburg", description: "Volkswagen's car-themed park with test drives, museums, and futuristic architecture.", category: "activity", lat: 52.4310, lng: 10.7937, xp: 60, estimatedEntryPrice: 18, regionId: "niedersachsen" },
  { id: "act-wildpark-lueneburger", title: "Wildpark Lueneburger Heide", description: "Large wildlife park with bears, wolves, and birds of prey shows in the heathlands.", category: "activity", lat: 53.1833, lng: 9.8833, xp: 50, estimatedEntryPrice: 13, regionId: "niedersachsen" },
  { id: "act-universum-bremen", title: "Universum Bremen", description: "Interactive science center shaped like a whale. Hands-on exhibits about technology, humans, and earth.", category: "activity", lat: 53.1075, lng: 8.8526, xp: 55, estimatedEntryPrice: 16, regionId: "bremen" },
  { id: "act-rulantica", title: "Rulantica Water World", description: "Europa-Park's massive indoor water park with 25 slides and a Nordic theme.", category: "activity", lat: 48.2587, lng: 7.7295, xp: 75, estimatedEntryPrice: 42, regionId: "baden-wuerttemberg" },
  { id: "act-belantis", title: "Belantis Leipzig", description: "Largest amusement park in eastern Germany with themed worlds and roller coasters.", category: "activity", lat: 51.2721, lng: 12.3098, xp: 60, estimatedEntryPrice: 35, regionId: "sachsen" },
  { id: "act-karls-erdbeerhof", title: "Karls Erlebnis-Dorf Roevershagen", description: "Strawberry-themed adventure village near Rostock with rides, mazes, and farm experiences.", category: "activity", lat: 54.1160, lng: 12.2253, xp: 45, estimatedEntryPrice: 0, regionId: "mecklenburg-vorpommern" },
  { id: "act-skyline-park", title: "Skyline Park", description: "Family amusement park in Allgaeu with the Sky Dragster and alpine views.", category: "activity", lat: 47.9167, lng: 10.8167, xp: 55, estimatedEntryPrice: 33, regionId: "bayern" },
  { id: "act-holidaypark", title: "Holiday Park", description: "Theme park in the Palatinate with the launched coaster Expedition GeForce.", category: "activity", lat: 49.3178, lng: 8.2983, xp: 65, estimatedEntryPrice: 40, regionId: "rheinland-pfalz" },
  { id: "act-fort-fun", title: "Fort Fun Abenteuerland", description: "Wild West themed park in the Sauerland hills with a cable car ride and summer toboggan.", category: "activity", lat: 51.3167, lng: 8.4667, xp: 50, estimatedEntryPrice: 30, regionId: "nordrhein-westfalen" },
];

export const ACTIVITY_BY_ID: Record<string, Activity> =
  Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));
