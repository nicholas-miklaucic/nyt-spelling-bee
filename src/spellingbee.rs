//! This module provides the `SpellingBeeGame` struct, which stores previously-entered words, checks
//! words for validity, and scores them appropriately.

use std::collections::BTreeSet;
use lexi::{Lexicon, VecLexicon, wordlist};
use wasm_bindgen::prelude::*;
use crate::utils::set_panic_hook;

use web_sys;

// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

/// The minimum length of a play.
pub const MIN_LENGTH: usize = 4;
/// The bonus for playing a pangram.
pub const PANGRAM_BONUS: usize = 7;

/// A game of the NYT Spelling Bee, with six optional letters and a required one. Lets users play
/// words and check them for validity, keeping track of the score.
#[wasm_bindgen]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct SpellingBeeGame {
    /// The letters that may be used, but don't have to be. Kept in sorted order so as to avoid
    /// revealing any information when shown to the user.
    optional_letters: BTreeSet<char>,

    /// The required letter.
    required_letter: char,

    /// The current score. Check the `score()` method for more information about how this is
    /// computed.
    score: usize,

    /// The currently played words.
    played_so_far: BTreeSet<String>,

    /// The valid words accepted by the game.
    words: BTreeSet<String>,
}

/// The possible outcomes of playing a move.
#[wasm_bindgen]
#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash)]
pub enum PlayResult {
    /// The word is valid and new: it has been added to the list and the score
    /// has been updated.
    Valid,

    /// The word has already been played.
    AlreadyPlayed,

    /// The word is not in the lexicon.
    InvalidWord,

    /// The word is less than `MIN_LENGTH` (four) letters.
    InvalidLength,

    /// The word doesn't use the required letter or has letters that are not
    /// allowed.
    InvalidLetters,
}

#[wasm_bindgen]
impl SpellingBeeGame {
    /// Creates a new spelling bee game from a set of optional letters and a
    /// single required letter, using the given input buffers for lexicons.
    pub fn new(optional_letters: &str, required_letter: char, main_words: &str,
               swears: &str) -> SpellingBeeGame
    {
        set_panic_hook();
        let mut lex: VecLexicon = wordlist::parse_strings(main_words,
                                                          swears).unwrap().into();

        let mut allowed_letters: String = required_letter.to_string();
        allowed_letters.push_str(optional_letters);
        lex.only_using_letters(allowed_letters.chars());
        lex.with_letter(required_letter);
        lex.with_more_length(MIN_LENGTH-1);

        log!("{:?}", lex);

        SpellingBeeGame {
            optional_letters: optional_letters.chars().collect(),
            required_letter,
            score: 0,
            played_so_far: BTreeSet::new(),
            words: lex.into_iter().collect()
        }
    }

    /// Returns the current score.
    ///
    /// Score is computed as follows: a four-letter word is worth one point. Any
    /// word longer than that (words shorter than four letters are not allowed)
    /// is worth a point for every letter it has. If the word uses all of the
    /// given letters, it receives an additional seven points.
    pub fn score(&self) -> usize {
        self.score
    }

    /// Accepts a given word, updating internal state and returning the result
    /// of the play.
    pub fn play(&mut self, word: &str) -> PlayResult {
        if word.len() < MIN_LENGTH {
            PlayResult::InvalidLength
        } else if !self.has_valid_letters(word) {
            PlayResult::InvalidLetters
        } else if !self.is_valid_word(word) {
            PlayResult::InvalidWord
        } else if self.played_so_far.contains(word) {
            PlayResult::AlreadyPlayed
        } else {
            self.played_so_far.insert(word.to_string());
            self.score += self.score_word(word);
            PlayResult::Valid
        }
    }

    /// Checks if the given input is valid, in that it only consists of allowed
    /// letters.
    pub fn is_valid_partial_input(&self, word: &str) -> bool {
        word.chars().all(|c| self.optional_letters.contains(&c) ||
                         c == self.required_letter)
    }

    /// Checks if the given word has only the allowed letters and includes the
    /// required letter.
    fn has_valid_letters(&self, word: &str) -> bool {
        word.contains(self.required_letter) &&
            word.chars().all(|c| self.optional_letters.contains(&c) ||
                             c == self.required_letter)
    }

    /// Checks if the given word is in the answer list.
    fn is_valid_word(&self, word: &str) -> bool {
        self.words.contains(word)
    }

    /// Computes the score for a word. See the `score()` function for more on
    /// how this is calculated. Returns 0 for invalid words.
    fn score_word(&self, word: &str) -> usize {
        let base = if word.len() < MIN_LENGTH {
            0
        } else if word.len() == MIN_LENGTH {
            1
        } else {
            word.len()
        };

        if self.is_pangram(word) {
            base + PANGRAM_BONUS
        } else {
            base
        }
    }

    /// Returns `true` if this word is both valid and contains every given
    /// letter and `false` otherwise.
    pub fn is_pangram(&self, word: &str) -> bool {
        self.is_valid_word(word) &&
            word.contains(self.required_letter) &&
            self.optional_letters.iter().all(|c| word.contains(*c))
    }

    /// Returns the required central letter.
    pub fn required_letter(&self) -> char {
        self.required_letter
    }

    /// Returns the maximum score with all words.
    pub fn max_score(&self) -> usize {
        self.words.iter().map(|w| self.score_word(w)).sum()
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_score() {
        let mut game: SpellingBeeGame = SpellingBeeGame::new("clwgro", 'i');
        assert_eq!(game.score(), 0);
        assert_eq!(game.play("will"), PlayResult::Valid);
        assert_eq!(game.score(), 1);
        assert_eq!(game.play("cowgirl"), PlayResult::Valid);
        assert_eq!(game.score(), 15);
        assert_eq!(game.play("rail"), PlayResult::InvalidLetters);
        assert_eq!(game.score(), 15);
        assert_eq!(game.play("roll"), PlayResult::InvalidLetters);
        assert_eq!(game.score(), 15);
        assert_eq!(game.play("clwgi"), PlayResult::InvalidWord);
        assert_eq!(game.score(), 15);
        assert_eq!(game.play("oil"), PlayResult::InvalidLength);
        assert_eq!(game.score(), 15);
        assert_eq!(game.play("cowgirl"), PlayResult::AlreadyPlayed);
        assert_eq!(game.score(), 15);
    }
}
