# pacman-2016
Javascript version of the arcade classic

2016 update of my Javascript Pacman game from 1999 (also on github).

See www.mattplatts.com/pacman/

The original version was built for IE4 and Netscape 4, and was updated to support Netscape 6 in 2001, Chrome and Firefox in 2009, and I decided to look at it again in 2016 to see how it could be improved.

Improvements so far:
--------------------

1. Generate the mazes from far simpler data than the huge data array of possible directions - now it is mainly 0s and 1s - and use this data to draw the maze in css as opposed to using a background graphic, as well as using it for the basis of game calculations.

2. CSS animated pacman rather than a gif

3. Removal of <frameset> (in order to store data between different levels in a hidden frame - how very 1999!), and removal of hard coded html pages for each level, in favour of local storage and dynamic loading and rendering of maze data between levels.

4. Re-implementation of ghost algorithms. The original version had randomly moving ghosts which could only detect if you were in their direct line of sight and act accordingly. New implementation features scatter, chase and random modes similar to that of the original game, which can be switched as required. They can now home in on you from afar if they so choose.

5. New logic allowing modifications to the speed of pacman outside of the game loop

6. Better collision detection.

7. Delay ghosts leaving home base incrementally rather than them all exiting at once (as per original NAMCO game).

8. Conversion of maze junction data from 'expensive' to work with data to binary data, in order to employ leaner bitwise maths and less storage required.

9. Tidying up of code and commenting.

+ More in 2019
--------------

10. Implemented a random maze generation feature using a recursive backtracker algorithm, tweaked again in 2021. Just this in itself is an entire project! Anyhow, you can now play the originally designed 10 levels, or randomly generated levels.
11. Began implementing a proper OO architecture to the code. At least, created classes for pacman and the ghosts and have these run as objects in the game, in attempt to salvage the spaghetti code. Plenty still to be done here!

Currently known bugs / issues / thoughts

1. Firefox testing didn't go well (Chrome and IE seemed fine)

2. Not tested in Safari, Opera or any other browser.

3. There is some weird issue with the DOCTYPE declaration on pacman.html - it won't work with any known doctype (Chrome), but runs fine with no doctype. There's a rabbit hole to go down here, I may be some time...

Future improvements will be
---------------------------

1. The code architecture is old and based on tweaking the original 1999 code. A proper OO architecture would be beneficial if any more logic is to go in now, modification of global variables from all over the place is getting very confusing, I'm actually surprised it's stood up so far, but this is why bugs are creeping in sometimes, it's very hard to read. Commenting has been my first part of really understanding what I need to do.

2. Spilt all the constants out into configuration/settings, more adjustments on these on various triggers as part of the gameplay in order to increase difficulty in a better way (currently it speeds up a little between levels).

3. Create your own maze feature - now everything is generated from a simple data format, it would be easy to allow people to create their own.

4. Random maze generation algorithm, based on a modification of the known recursive backtracker algorithm but to take the double walls into account (Recusrive backgracker deals with borders on all cells, not some cells blocked as walls).

5. Selections for different logic and modes of play. I've found lots of things that work interestingly. It's facinating to see how small changes change the feel of the game greatly as well.

6. Some wild and crazy features going beyond a pacman clone :)
