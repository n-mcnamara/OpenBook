# OpenBook `<| O |>`

**A cozy, retro, and decentralized bookshelf built on Nostr.**

OpenBook is a censorship-resistant alternative to Goodreads where you control your data. Log in with your Nostr identity and start sharing your reading journey.

![OpenBook Screenshot](https://user-images.githubusercontent.com/395622/230791299-03358575-358a-4283-8744-910515f5615f.png)

## Unique Features

- **Private, Encrypted Bookshelves:** Your reading list is your business. Keep your shelves private with strong, client-side encryption.
- **Share with Friends:** Grant access to your private shelves to specific friends by securely sharing your shelf's key via an encrypted message.
- **Resilient Metadata:** The app can pull book data from the Open Library API, but it also uses a community-driven, Nostr-based metadata system. You can switch between sources at any time.
- **Open Discussions:** Every book has an open discussion thread in addition to structured reviews, allowing for free-form conversation.

## Core Nostr Protocol

OpenBook is built on a few key NIPs and custom event kinds:

- **NIP-07:** Securely log in and perform actions using a browser extension (like Alby or nos2x).
- **NIP-44:** Provides the strong encryption used for sharing private shelf keys.
- **`kind: 1`**: Standard short text notes, used for the open discussion threads.
- **`kind: 7`**: Reactions, used for liking/disliking reviews and books.
- **`kind: 30451`**: A custom kind for a user's public review/shelf status for a book.
- **`kind: 30454`**: A custom kind for a user's *private*, encrypted review/shelf status.
- **`kind: 30452`**: A custom kind for community-sourced, objective metadata for a book.