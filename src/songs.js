// ─── SONG LIBRARY ─────────────────────────────────────────────────────────────
// Add or remove songs here. song_id must match what's stored in Supabase.

export const SONG_LIBRARY = [
  { id: 1, title: "Wonderwall", artist: "Oasis", key: "Em", genre: "Rock" },
  { id: 2, title: "Sweet Home Chicago", artist: "Robert Johnson", key: "E", genre: "Blues" },
  { id: 3, title: "Brown Eyed Girl", artist: "Van Morrison", key: "G", genre: "Pop Rock" },
  { id: 4, title: "Superstition", artist: "Stevie Wonder", key: "Ebm", genre: "Funk/Soul" },
  { id: 5, title: "Valerie", artist: "Amy Winehouse", key: "C", genre: "Soul" },
  { id: 6, title: "Mr. Brightside", artist: "The Killers", key: "C#", genre: "Indie Rock" },
  { id: 7, title: "I Will Survive", artist: "Gloria Gaynor", key: "Am", genre: "Disco" },
  { id: 8, title: "Fly Me To The Moon", artist: "Frank Sinatra", key: "Am", genre: "Jazz" },
];

// ─── CHORD SHEETS ─────────────────────────────────────────────────────────────
// Keyed by song id. Format: [Section] headers, chord lines, lyric lines.

export const SONG_CONTENT = {
  1: `[Verse 1]
Em7        G          Dsus4       A7sus4
Today is gonna be the day that they're gonna throw it back to you
Em7        G          Dsus4       A7sus4
By now you should've somehow realized what you gotta do

[Chorus]
C          Em7         C          Em7
And all the roads we have to walk are winding
C          Em7         C          Em7
And all the lights that lead us there are blinding

C    Em7       G      Em7
Because maybe, you're gonna be the one that saves me
C    Em7       G
And after all, you're my wonderwall`,

  2: `[Verse 1]
E7
Oh, baby don't you want to go
A7                    E7
Back to the land of California, to my sweet home Chicago

[Bridge]
B7              A7
Now, one and one is two, two and two is four
E7                     B7
I'm heavy loaded baby, I'm booked, I gotta go

[Verse 3]
E7
Cryin' baby honey don't you want to go
A7                    E7         B7
Back to the land of California, to my sweet home Chicago`,

  3: `[Verse 1]
G              C           G              D
Hey where did we go, days when the rains came?
G              C         G             D
Down in the hollow, playing a new game

[Chorus]
C           D              G      Em
And you, my brown eyed girl
C            D                 G
You my brown eyed girl`,

  4: `[Verse 1]
Ebm
Very superstitious, writings on the wall
Ebm
Very superstitious, ladders bout to fall

[Chorus]
Ab7                   Ebm
When you believe in things that you don't understand
Ab7              Ebm
Then you suffer, superstition ain't the way`,

  5: `[Verse 1]
C                              Dm
Well sometimes I go out by myself and I look across the water

[Chorus]
C        Dm
Won't you come on over, stop making a fool out of me
C        Dm
Why don't you come on over, Valerie`,

  6: `[Verse 1]
C#               Bb              F               Bb
Coming out of my cage and I've been doing just fine
C#               Bb              F               Bb
It started out with a kiss how did it end up like this

[Chorus]
C#              Bb              F
Now I'm falling asleep and she's calling a cab
Bb                 F
And it's all in my head`,

  7: `[Verse 1]
Am              Dm
At first I was afraid, I was petrified
G                     C
Kept thinking I could never live without you by my side

[Chorus]
Am        Dm
And so you're back from outer space
G                       C
I just walked in to find you here with that sad look upon your face`,

  8: `[Verse 1]
Am        Dm        G7          C
Fly me to the moon, let me play among the stars
Fmaj7         Bm7b5    E7            Am
Let me see what spring is like on Jupiter and Mars

[Bridge]
Dm7       G7         Cmaj7      Am
In other words, hold my hand
Dm7       G7               C
In other words, darling kiss me`,
};
