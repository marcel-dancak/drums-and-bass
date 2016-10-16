(function() {
  'use strict';

  angular
    .module('bd.app')
    .controller('PlaylistViewer', PlaylistViewer);

  function PlaylistViewer($scope, $timeout, $q, audioPlayer, projectManager, workspace, $mdCompiler, HighlightTimeline) {

    var viewerTrackId = workspace.bassSection.track.id;

    if (!workspace.selectedPlaylistId) {
      workspace.playlist = projectManager.project.playlists[0];
      workspace.selectedPlaylistId = workspace.playlist.id;
    }

    // workspace.track = projectManager.project.tracksMap['bass_0'];
    var projectSections = angular.copy(projectManager.project.sections);
    $scope.sectionNames = {};
    projectSections.forEach(function(section) {
      $scope.sectionNames[section.id] = section.name;
    });

    $scope.visibleSubbeats = {
      3: {
        1: true,
        2: true,
        3: true,
        4: false
      }, 4:{
        1: true,
        2: true,
        3: true,
        4: true
      }
    };

    var playlist;
    var playlistSlidePosition;
    var beatsPerSlide = 8;
    var playbackState;


    function generateSlide(playlist, position, count) {
      console.log('generateSlide');
      var task = $q.defer();

      var section = playlist[position.section];
      if (!section) {
        console.log('end');
        if (!playerSwiper.lastSlide) {
          console.log('** create empty slide');
          playerSwiper.appendSlide('<div class="swiper-slide"></div>');
          playerSwiper.lastSlide = true;
        }
        return $q.when();
      }
      var beats = [];

      var track = section.tracks[viewerTrackId];
      var counter = count;
      while (counter--) {
        var sectionFirstsBeat = position.bar === 1 && position.beat === 1;

        var trackBeat = track.beat(position.bar, position.beat);
        beats.push({
          bar: position.bar,
          beat: position.beat,
          subdivision: trackBeat.subdivision,
          sounds: track.beatSounds(trackBeat),
          timeSignature: section.timeSignature,
          bpm: section.bpm,
          subbeats: [1, 2, 3, 4]
        });
        if (sectionFirstsBeat) {
          beats[beats.length-1].sectionInfo = {
            name: section.name,
          };

        }
        position.beat++;
        if (position.beat > section.timeSignature.top) {
          position.beat = 1;
          position.bar++;
          if (position.bar > section.length) {
            position.bar = 1;
            position.section++;
            section = playlist[position.section];
            if (!section) break;
            track = section.tracks[viewerTrackId];
          }
        }
      }
      // generate empty beats to fill slide (when needed)
      while (beats.length < count) {
        beats.push({
          subdivision: 1,
          beat: ' ',
          sounds: []
        });
      }

      var scope = $scope.$new(false);
      scope.beats = beats;

      $mdCompiler.compile({
        templateUrl: 'views/playlist_slide.html'
      }).then(function(compileData) {
        //attach controller & scope to element
        var slideElement = compileData.link(scope);
        playerSwiper.appendSlide(slideElement);
        $timeout(function() {
          scope.$destroy();
          task.resolve();
        });
      });
      return task.promise;
    }

    var playerSwiper;

    var timeline = new HighlightTimeline({
      getBeatElem: function(bar, beat) {
        var beatsElems = playerSwiper.slides[playerSwiper.activeIndex].querySelectorAll('.beat');
        var beatElem = beatsElems[playbackState.beatsCounter];
        return beatElem;
      },
      getBarWrapper: function() {
        return playerSwiper.wrapper[0];
      }
    });

    function initializeSwiper() {
      var swiperElem = document.querySelector('.player.swiper-container');
      playerSwiper = new Swiper(swiperElem, {
        spaceBetween: 30,
        direction: 'vertical',
        slidesPerView: 1.99,
        slidesPerColumn: 1,
        initialSlide: 0,
        roundLengths: true
      });
      window.sw = playerSwiper;

      playerSwiper.on('transitionEnd', function(s) {
        console.log('activeIndex: {0} slides: {1}'.format(s.activeIndex, s.slides.length));
        if (s.slides.length - s.activeIndex <=  2 ) {
          console.log('generate NEXT slide');
          generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
        }
        if (s.activeIndex > 1) {
          // angular.element(s.slides[0]).scope().$destroy();
          /* auto-removing of slides */
          // s.removeSlide(0);
        }
      });

      playerSwiper.on('onSlidePrevEnd', function(s) {
        console.log('prev');
        // s.prependSlide('<div class="swiper-slide">Slide </div>');
        // s.removeSlide(s.slides.length-1);
      });
      playerSwiper.on('onSlideNextEnd', function(s) {
        console.log('next');
         //s.appendSlide('<div class="swiper-slide">Slide </div>');
         //s.removeSlide(0);
      });
    }

    initializeSwiper();

    function initPlaylistSlides() {
      var task = $q.defer();
      playlist = [];
      workspace.playlist.items.forEach(function(item) {
        var section = projectManager.getSection(item.section);
        for (var i = 0; i < item.repeats; i++) {
          playlist.push(section);
        }
      });

      playlistSlidePosition = {
        section: 0,
        bar: 1,
        beat: 1
      };
      playbackState = {
        section: 0,
        beatsCounter: -1
      };
      playerSwiper.slideTo(0, 0, false);
      playerSwiper.removeAllSlides();
      playerSwiper.lastSlide = false;

      var iterations = 3;
      var generate = function() {
        var promise = generateSlide(playlist, playlistSlidePosition, beatsPerSlide);
        if (--iterations > 0) {
          promise.then(generate);
        } else {
          promise.then(task.resolve);
        }
      }
      generate();
      return task.promise;
    }

    $scope.updatePlaylist = initPlaylistSlides;

    if (!projectManager.project.playlists[0] || projectManager.project.playlists[0].items.length === 0) {
      console.log('SHOW PLAYLIST EDITOR');
      $scope.ui.playlist.showEditor = true;
    } else {
      initPlaylistSlides();
    }

    function beatSync(evt) {
      if (!evt.playbackActive) {
        return;
      }
      playbackState.beatsCounter++;
      if (playbackState.beatsCounter >= beatsPerSlide) {
        playbackState.beatsCounter = 0;
        console.log('# SLIDE NEXT');
        playerSwiper.slideNext();
      }
      timeline.beatSync(evt);
    }

    function playSection() {
      var section = playlist[playbackState.section];
      audioPlayer.setBpm(section.bpm);

      audioPlayer.playbackRange = {
        start: {
          bar: 1,
          beat: 1
        },
        end: {
          bar: section.length,
          beat: section.timeSignature.top
        }
      };
      // audioPlayer.countdown = $scope.player.countdown;
      timeline.start();
      var countdown = $scope.player.countdown && playbackState.section === 0;
      audioPlayer.play(section, beatSync, countdown);
    }

    $scope.player.play = function() {
      initPlaylistSlides().then(function() {
        var sections = playlist.reduce(function(list, section) {
          if (list.indexOf(section) === -1) {
            list.push(section);
          }
          return list;
        }, []);
        $scope.player.playing = true;
        audioPlayer.fetchResources(sections).then(playSection);
      });
    };

    $scope.player.stop = function() {
      $scope.player.playing = false;
      playbackState.section = playlist.length;
      audioPlayer.stop();
    };

    function playbackStopped(evt) {
      playbackState.section++;
      if ($scope.player.playing && playbackState.section < playlist.length) {
        // continue in playlist
        playSection();
      } else {
        if ($scope.player.playing && $scope.player.loop) {
          // repeat playlist playback
          playbackState.section = 0;
          playbackState.beatsCounter = -1;
          playerSwiper.slideTo(0, 0);
          playSection();
        } else {
          // stop playback
          timeline.stop();
          playbackState.section = 0;
          $scope.player.playing = false;
        }
      }
    }

    audioPlayer.on('playbackStopped', playbackStopped);

    $scope.ui.selectTrack = function(trackId) {
      workspace.track = projectManager.project.tracksMap[trackId];
      viewerTrackId = trackId;
      initPlaylistSlides();
    }

    function playlistLoaded(playlist) {
      workspace.playlist = playlist;
      initPlaylistSlides();
    }

    audioPlayer.setPlaybackSpeed($scope.player.speed/100);
    $scope.ui.playbackSpeedChanged = function(speed) {
      audioPlayer.setPlaybackSpeed(speed/100);
    };

    projectManager.on('playlistLoaded', playlistLoaded);

    $scope.$on('$destroy', function() {
      audioPlayer.un('playbackStopped', playbackStopped);
      projectManager.un('playlistLoaded', playlistLoaded);
    });

  }
})();