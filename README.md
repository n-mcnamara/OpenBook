# OpenBook - A Decentralized Goodreads Alternative on Nostr

OpenBook is a censorship-resistant and decentralized social platform for book lovers, built on the Nostr protocol. It aims to provide the core functionality of Goodreads without the centralized control of a single corporation.

This project was built with React, TypeScript, Vite, and the Nostr Dev Kit (NDK).

## Features

- **User Authentication:** Log in securely using any NIP-07 browser extension.
- **Decentralized Book Discovery:** Search for books via the Open Library API, with results enriched to show which books have metadata stored on Nostr. The search gracefully falls back to a Nostr-only search if the API is unavailable.
- **Community-Sourced Metadata:** The app uses a custom Nostr event to create a decentralized, community-maintained database of book metadata, reducing reliance on centralized APIs.
- **Bookshelves:** Organize your reading life by shelving books as "Want to Read," "Currently Reading," or "Read."
- **Reviews & Ratings:** Add a 1-5 star rating and a written review for any book you've read.
- **User Profiles:** View any user's bookshelves and Nostr profile (name, bio, avatar).
- **Home Feed:** See the recent book-related activity from the people you follow.
- **Follow/Unfollow:** Manage your social graph directly within the app.
- **Edit Content:** Update or change your shelf status, rating, or review for any book.
- **Global Discover Feed:** Find new books and interesting users on a global feed of all recent activity.

## Nostr Protocol

This client uses two custom event kinds for its core functionality:

### `kind:30451` - Shelf & Review Event
This is a **replaceable event per book** that represents a user's personal interaction with a book. It contains their subjective data.
- **Identifier:** The `d` tag is the book's unique ID (from Open Library).
- **Content:** The user's written review.
- **Tags:** Contains the user's shelf `status` (e.g., "read") and `rating` (e.g., "5").

### `kind:30452` - Book Metadata Event
This is a **replaceable event per book** that represents the book's objective, canonical data. It is designed to be a community-maintained, decentralized encyclopedia entry for a book.
- **Identifier:** The `d` tag is the book's unique ID.
- **Searchable Tags:** Includes normalized `title` and `author` tags to allow for direct discovery on Nostr.
- **Content:** A JSON object containing the book's full title, author, cover image URL, and other metadata.