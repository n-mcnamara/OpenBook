# OpenBook `<| O |>`

**A cozy, retro, and decentralized bookshelf built on Nostr.**

OpenBook is a censorship-resistant alternative to Goodreads where you control your data. Log in with your Nostr identity and start sharing your reading journey.

![OpenBook Screenshot](https://user-images.githubusercontent.com/395622/230791299-03358575-358a-4283-8744-910515f5615f.png)

## Unique Features

- **Private, Encrypted Bookshelves:** Your reading list is your business. Keep your shelves private with strong, client-side encryption.
- **Share with Friends:** Grant access to your private shelves to specific friends by securely sharing your shelf's key via an encrypted message.
- **Resilient Metadata:** The app can pull book data from the Open Library API, but it also uses a community-driven, Nostr-based metadata system (`kind:30452`). You can switch between sources at any time.
- **Open Discussions:** Every book has an open discussion thread (`kind: 1`) in addition to structured reviews, allowing for free-form conversation.
- **Retro Terminal Aesthetic:** A unique, cozy, dark-mode UI that feels like the early internet.

## Core Nostr Events

- **`kind:30451`**: A user's public review/shelf status for a book.
- **`kind:30454`**: A user's *private*, encrypted review/shelf status for a book.
- **`kind:30452`**: Community-sourced, objective metadata for a book.
- **`kind:1`**: A comment in a book's open discussion thread.
- **`kind:7`**: A like/dislike reaction to a review or a book's metadata.
- **`kind:44`**: An encrypted message used to grant a friend access to your private shelf.
