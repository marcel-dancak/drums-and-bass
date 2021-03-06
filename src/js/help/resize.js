(function() {
  'use strict';

  angular
    .module('bd.help')
    .controller('ResizeSlideshow', ResizeSlideshow);


  function ResizeSlideshow($scope, $element, $timeout, bassEditor, workspace) {

    var editSound, editElem;

    function startResize(index) {
      var soundElem = $element[0].querySelectorAll('.sound-container')[index];
      editElem = angular.element(soundElem.querySelector('.resize-container'));
      editSound = editElem.scope().sound;

      bassEditor.selector.select(editSound);
      editElem.addClass('hover');
      // this should be redesigned somehow
      if (!workspace.trackSection) {
        workspace.trackSection = $scope.workspace.trackSection;
      }
      bassEditor.resizeHandler.onResizeStart(
        editSound,
        {element: editElem, width: editElem[0].offsetWidth}
      );
    }
    function resizeTo(factor) {
      var startWidth = editElem[0].clientWidth;
      var endWidth = startWidth * factor;
      bassEditor.resizeHandler.onResize(
        editSound,
        {element: editElem, width: endWidth}
      );
    }
    function finishResize() {
      // timeout is used for nicer animation
      $timeout(function() {
        bassEditor.resizeHandler.onResizeEnd(
          editSound,
          {element: editElem},
          {stopPropagation: angular.noop}
        );
      });
    }

    $scope.instructions = [
      /* Create sounds */
      function() {
        $scope.workspace.trackSection.addSound(
          $scope.workspace.trackSection.beat(1, 1),
          {
            start: 0.25,
            string: 'A',
            style: 'slap',
            note: {
              type: 'regular',
              name: 'B',
              octave: 1,
              fret: 2,
              length: 16,
            }
          }
        );
        $scope.workspace.trackSection.addSound(
          $scope.workspace.trackSection.beat(1, 2),
          {
            start: 0.25,
            string: 'A',
            style: 'slap',
            note: {
              type: 'regular',
              name: 'C',
              octave: 2,
              fret: 3,
              length: 16,
            }
          }
        );
        $scope.workspace.trackSection.addSound(
          $scope.workspace.trackSection.beat(1, 2),
          {
            start: 0.5,
            string: 'A',
            style: 'slap',
            note: {
              type: 'regular',
              name: 'E',
              octave: 2,
              fret: 7,
              length: 16,
            }
          }
        );
      },
      function() {
        startResize(0);
      },
      function() {
        resizeTo(3);
      },
      function() {
        finishResize();
      },
      /* Combine two sounds into the slide */
      function() {
        bassEditor.selector.clearSelection();
        editElem.removeClass('hover');
      },
      function() {
        startResize(1);
      },
      function() {
        resizeTo(2);
      },
      function() {
        finishResize();
      },
      /* Clear bass sheet */
      function() {
        bassEditor.selector.clearSelection();
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 1));
        $scope.workspace.trackSection.clearBeat($scope.workspace.trackSection.beat(1, 2));
      }
    ];
  }

})();