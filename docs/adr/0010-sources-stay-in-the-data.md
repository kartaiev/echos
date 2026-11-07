# Sources stay in the data, not on the screen

ADR-0001 made every theory value a sourced value: a citation and a review status travel with it. For a while the interface showed them too: a Theory tables page listing every value with its source, its review status and a link to leave a remark, citations on the Mode Variant cards, and a Sources section in the practice setup.

Students do not read citations while practising, and the tables page was the longest page in the app with nothing to practise on it. The project's reviewer reaches the owner directly. So the interface no longer shows sources, review status or the tables page; the Modes page and the Ladder show the theory a student uses.

The citations and review statuses stay in the data and in the tests exactly as before: they are how a value gets into the app and how a reviewer checks it, in the code. `describeScale`, `playScale` and the other session queries the tables page used are kept for the same reason and for a later reviewer view.
