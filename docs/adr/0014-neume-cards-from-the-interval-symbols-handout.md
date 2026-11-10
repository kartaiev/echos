# Neume Cards from the Interval Symbols handout

The Neumes Deck is read off the Trisagion School handout "Interval Symbols" (ByzB 102), kept as sourced data in `src/core/theory/neumes.ts` like the other tables (ADR-0001, ADR-0010). It holds two kinds of Card:

- the name of each Neume the handout names alone: Ison, Oligon, Kentima, Kentimata, Petasti, Apostrofos, Elafron, Yporroi, Chamili, Continuous Elafron;
- where each written interval takes the melody: every form on the handout from up seven to down seven, the alternative forms each as a Card of its own, the two-note combinations (up one then up one, down one then up one, down one then down one), and the Petasti column, which the handout marks as an optional ornament.

The names come first in the Deck, so a student meets the signs before the intervals built from them.

The Ypsili has no Card of its own: the Neanes font draws it only as part of a combination, never alone, and a Card must show the sign as it is printed. Each Card draws one precomposed SBMuFL glyph, checked against the handout by eye; none is put together from parts.
