Goggle Paper
============

#### Positional tracking for Google Cardboard ####

Adding simple positional tracking to VR goggles like [Cardboard](https://developers.google.com/cardboard/) inexpensively with paper tracking markers.


### Try it ###

[Cardboard, using front camera](http://gogglepaper.com/repo/examples/inside-out.html) : Place marker in front of you, or just face a monitor with this [page](http://gogglepaper.com/repo/examples/marker.html) on-screen  
[Rift DK1 tracking](http://gogglepaper.com/repo/examples/outside-in.html) : Put a marker on front of Rift  
[Debug](http://gogglepaper.com/repo/examples/debug.html) : Debug camera and orientation data  

### Tips ###

- Have about an inch or more or whitespace surrounding the marker for better tracking
- For testing, a phone with the marker on-screen works well
- Tracking is contrast dependent, so the marker being well lit is important

### Roadmap ###

Possibilities:
- increased robustness, via better algorithms and multiple marker tracking
- native Cardboard Android app for better performance
- combining inside-out and outside-in tracking to produce middle-out tracking, for optimal tip-to-tip efficiency  
- abandon project once [Google Tango](https://www.google.com/atap/projecttango/)-like positional tracking supported natively and ubiquitiously


### Credits ###

The heavy lifting done by these pieces glued together:  

[cardboard](https://developers.google.com/cardboard/) : google cardboard  
[three.js](http://threejs.org) : awesome 3d library for the web  
[js-aruco](https://github.com/jcmellado/js-aruco) : js port of the aruco library for tracking  

