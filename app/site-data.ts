import type { MusicTrack } from "./MusicGrid";

export const navigation = [
  ["TOP", "/#top"],
  ["GALLERY", "/#gallery"],
  ["MUSIC", "/#music"],
  ["SNS", "/#sns"],
  ["SHOP", "/#shop"],
  ["PROFILE", "/#profile"],
  ["NEWS", "/#news"],
  ["JOURNAL", "/#journal"],
  ["CONTACT", "/#contact"],
] as const;

export const galleryItems = [
  { src: "/gallery/gallery-07.webp", alt: "White-haired angel sitting beside blue water" },
  { src: "/gallery/gallery-08.webp", alt: "White-haired angel viewed from a low angle" },
  { src: "/gallery/gallery-09.webp", alt: "White-haired angel in an ornate white dress" },
  { src: "/gallery/gallery-10.webp", alt: "Angel tying her hair in soft blue light" },
  { src: "/gallery/gallery-11.webp", alt: "Angel sitting on a swing in the sunlight" },
  { src: "/gallery/gallery-12.webp", alt: "White-haired angel in blue and orange foliage" },
  { src: "/gallery/gallery-01.webp", alt: "White-haired angel holding an apple" },
  { src: "/gallery/gallery-02.webp", alt: "White-haired angel surrounded by blue and gold foliage" },
  { src: "/gallery/gallery-03.webp", alt: "White-haired angel reaching toward a glowing orb" },
  { src: "/gallery/gallery-04.webp", alt: "Angel holding a flower in soft morning light" },
  { src: "/gallery/gallery-05.webp", alt: "Girl under the moon above a night city" },
  { src: "/gallery/gallery-06.webp", alt: "Girl beside a railway crossing at blue hour" },
] as const;

export const musicTracks: MusicTrack[] = [
  {
    title: "Marry Me? (feat. おchillちゃん)",
    artwork: "/music/marry-me.jpg",
    spotifyUrl: "https://open.spotify.com/track/1wqFSMqLQB9ArZ7AMNqDxo",
    previewUrl: "https://p.scdn.co/mp3-preview/1f9180287bbfe578baebc36c5d8aaac29b5656f7",
  },
  {
    title: "夜中、3時半に、また (feat. おchillちゃん)",
    artwork: "/music/marry-me.jpg",
    spotifyUrl: "https://open.spotify.com/track/4k3gRshbHLKbx8xGX9WfZn",
    previewUrl: "https://p.scdn.co/mp3-preview/9bf5d0f39a06a87ba082bf502c66c6490cd807ec",
  },
  {
    title: "Today, I smiled. (feat. Rin)",
    artwork: "/music/today-i-smiled.jpg",
    spotifyUrl: "https://open.spotify.com/track/6Am8QCT72RHW1rFEr4QmmE",
    previewUrl: "https://p.scdn.co/mp3-preview/b437b632b7065aa765a9ef7d0cd6e5e5c17de656",
  },
  {
    title: "Keep me running (feat. Rin)",
    artwork: "/music/today-i-smiled.jpg",
    spotifyUrl: "https://open.spotify.com/track/2dpp6kRYICU4VdtXCEzH8r",
    previewUrl: "https://p.scdn.co/mp3-preview/f054288f2b04c4edaf6434509400e1185db64a74",
  },
  {
    title: "Sweater Weather Girl (feat. Rin)",
    artwork: "/music/today-i-smiled.jpg",
    spotifyUrl: "https://open.spotify.com/track/47nZ3zEJPMGoRWGBqfA2N8",
    previewUrl: "https://p.scdn.co/mp3-preview/16a1e38b3df93da880fc5b8b572d73d3f9762dcb",
  },
  {
    title: "SNS jellyfish (feat. Rin)",
    artwork: "/music/today-i-smiled.jpg",
    spotifyUrl: "https://open.spotify.com/track/1CNzGUIEukxlfxTwquavET",
    previewUrl: "https://p.scdn.co/mp3-preview/8ac1e05b760b6f5caffb707767ffe42bf6c33c46",
  },
  {
    title: "Under the moon (feat. Rin)",
    artwork: "/music/today-i-smiled.jpg",
    spotifyUrl: "https://open.spotify.com/track/0eOOClDDqxTimkb2jptbIG",
    previewUrl: "https://p.scdn.co/mp3-preview/d04fd1b54932b11c4354690d9056f0ac3a451e30",
  },
  {
    title: "私、天使なんだけど (feat. おchillちゃん)",
    artwork: "/music/watashi-tenshi.jpg",
    spotifyUrl: "https://open.spotify.com/track/6P0VwfjHBmEmYRZkzyc5dT",
    previewUrl: "https://p.scdn.co/mp3-preview/4b6babf0071ac4fc870e28846eea2f121988e9a9",
  },
  {
    title: "AIなんていらない",
    artwork: "/music/ai-nante-iranai.jpg",
    spotifyUrl: "https://open.spotify.com/track/4kLgABtDPMiFG0yvqL4sN6",
    previewUrl: "https://p.scdn.co/mp3-preview/bcd3a9aa2df94fb73826a7d2c623986712d279ea",
  },
  {
    title: "指についた星 — JAGA RECORDS mix",
    artwork: "/music/yubi-ni-tsuita-hoshi.jpg",
    spotifyUrl: "https://open.spotify.com/track/5dvmoAORWyvZyq6tIRFixJ",
    previewUrl: "https://p.scdn.co/mp3-preview/6b71be18b4bb711922c9be4376ac7edf94acfa09",
  },
  {
    title: "朝と海とレモンチューハイ (feat. おchillちゃん)",
    artwork: "/music/asa-umi-lemon.jpg",
    spotifyUrl: "https://open.spotify.com/track/2R6y0bROSl6wScPOjUM2Ku",
    previewUrl: "https://p.scdn.co/mp3-preview/f0d95ebcf596a99420814267caac488624c779ec",
  },
  {
    title: "ヘッドホンは宇宙船 (feat. おchillちゃん)",
    artwork: "/music/headphone-spaceship.jpg",
    spotifyUrl: "https://open.spotify.com/track/4lOsXg985ypaIIGliBnNzC",
    previewUrl: "https://p.scdn.co/mp3-preview/5d7d785964807378ad25858ec82bf468846677bf",
  },
];
