console.info('Engine loaded')

let initFired = false;

document.addEventListener("DOMContentLoaded", function() {
  if (initFired) return;
  initFired = true;
  console.log('DOM loaded')
  window.editor = new Editor();
});
window.onload = function() {
  if (initFired) return;
  initFired = true;
  console.log('Window loaded')
  window.editor = new Editor();
}

class Editor {

  constructor() {

    this.tools = {
      pointer: {
        dom: document.getElementById('pointer-tool'),
        events: {
          switch: function() {

          },
          unswitch: function() {

          }
        }
      },
      hand: {
        dom: document.getElementById('hand-tool'),
        cursor: 'grab',
        events: {
          switch: function() {

          },
          unswitch: function() {

          }
        }
      },
      add: {
        dom: document.getElementById('add-tool'),
        events: {
          switch: function() {

          },
          unswitch: function() {

          }
        }
      }
    }

    if (this.isPreviousWorkspaceExists()) {
      this.restoreWorkspace()
    } else {
      this.newWorkspace()
    }

    this.graphicsDebugger = new GraphicsDebugger()

    if (this.workspace.settings.debugger.enabled)
      this.graphicsDebugger.start()

    if (this.workspace.settings.debugger.mouseTracker)
      this.graphicsDebugger.startMouseTracking()

    this.initTools()
    this.switchTool(this.workspace.tools.selected)

    this.ground = new Ground(this)

    this.ground.changeSize(this.workspace.ground.size)
    this.ground.changePosition(this.workspace.ground.position)
    this.ground.changeScale(this.workspace.ground.scale)

  }

  isPreviousWorkspaceExists() {
    return !!localStorage.getItem('workspace')
  }

  restoreWorkspace() {
    this.workspace = JSON.parse(localStorage.getItem('workspace'))
    // TODO: some business stuff here
  }

  newWorkspace() {

    this.workspace = {
      tools: {
        selected: 'pointer'
      },
      ground: {
        size: {
          width: 1024,
          height: 2048
        },
        position: {
          left: 512,
          top: window.screen.height / 2 - (window.screen.height / 5)
        },
        scale: 100
      },
      settings: {
        debugger: {
          enabled: true,
          mouseTracker: true
        }
      }
    }

    this.saveWorkspace()

  }

  saveWorkspace() {
    localStorage.setItem('workspace', JSON.stringify(this.workspace))
  }

  initTools() {
    const that = this;
    for (const toolName in this.tools)
      this.tools[toolName].dom.addEventListener('click', function() {
        that.switchTool(toolName)
      })
  }

  switchTool(toolName) {

    this.workspace.tools.selected = toolName
    this.graphicsDebugger.debugData.cursor['tool'] = this.workspace.tools.selected

    this.saveWorkspace()

    console.info(`Tool switched to ${toolName}`);
    for (const _toolName in this.tools)
      if (_toolName !== toolName)
        this.tools[_toolName].dom.classList.remove('selected')

    this.tools[toolName].dom.classList.add('selected');

    document.getElementById('scene').style.cursor =
      typeof this.tools[toolName]['cursor'] == 'undefined'
        ? 'default'
        : this.tools[toolName]['cursor']

  }

}

class GraphicsDebugger {

  constructor() {

    this.elements = {
      'cursor': document.getElementById('debug-cursor')
    }

    this.fps = 18

    this.debugData = {
      'cursor': {}
    }
  }

  start() {

    for (const element in this.elements)
      this.elements[element].classList.remove('hidden')

    const that = this

    let previousDebugData = null

    this.interval = setInterval(
      () => {

        // Do not draw when nothing changed
        // It will save a lot of graphics resources
        // You can see difference in Mozilla Firefox Profiler
        // TODO: JSON.stringify is too CPU expensive
        const _debugData = JSON.stringify(that.debugData)
        if (_debugData == previousDebugData) return;
        previousDebugData = _debugData;

        for (const element in that.elements) {
          let raws = ''
          if (typeof that.debugData[element] !== 'undefined')
            for (const key in that.debugData[element])
              raws += `<tr><td>${key}</td><td>${that.debugData[element][key]}</td></tr>`
          that.elements[element].innerHTML = `<table>${raws}</table>`
        }
      },
      // FPS - frames per second
      // 1 second - 1000ms
      // So, in 1s we have to make N redraws
      // Each redraw should be performed in X ms
      // Let's calculate it:
      Math.floor(1000 / this.fps)
    )

  }

  stop() {

    for (const element in this.elements)
      this.elements[element].classList.add('hidden')

    clearInterval(this.interval)

  }

  startMouseTracking() {

    console.info("Mouse tracking started")

    this.debugData.cursor['pagePos'] = 'x: - / y: -'
    this.debugData.cursor['clientPos'] = 'x: - / y: -'
    this.debugData.cursor['posRegion'] = '-'
    this.debugData.cursor['hoverObj'] = '-'
    this.debugData.cursor['tool'] = '-'
    this.debugData.cursor['mouseWheel'] = 'x: - / y: -'

    document.addEventListener("mousemove", this._cursorMoveTracker.bind(this));
    document.addEventListener('wheel', this._mouseWheelTracker.bind(this));

  }

  stopMouseTracking() {

    console.info("Mouse tracking stopped")

    delete this.debugData.cursor['pagePos']
    delete this.debugData.cursor['clientPos']
    delete this.debugData.cursor['posRegion']
    delete this.debugData.cursor['hoverObj']
    delete this.debugData.cursor['tool']
    delete this.debugData.cursor['mouseWheel']

    document.removeEventListener("mousemove", this._cursorMoveTracker);
    document.removeEventListener('wheel', this._mouseWheelTracker);

  }

  _cursorMoveTracker(event) {

    this.debugData.cursor['pagePos'] = `x: ${event.pageX} / y: ${event.pageY}`
    this.debugData.cursor['clientPos'] = `x: ${event.clientX} / y: ${event.clientY}`

    this.elements.cursor.style.top = `${event.clientY + 10}px`
    this.elements.cursor.style.left = `${event.clientX + 10}px`

    const hoverObjectId = document.elementFromPoint(event.clientX, event.clientY).id
    this.debugData.cursor['hoverObj'] = hoverObjectId !== "" ? hoverObjectId : "?"

    const hoverObjects = document.elementsFromPoint(event.clientX, event.clientY)
    let region = "other"
    for (const dom of hoverObjects) {
      if (dom.id === "ground" || dom.id === "scene") {
        region = dom.id
        break
      }
    }
    this.debugData.cursor['posRegion'] = region

    this.debugData.cursor['mouseWheel'] = 'x: 0 / y: 0'

  }

  _mouseWheelTracker(event) {
    this.debugData.cursor['mouseWheel'] = `x: ${event.deltaX} / y: ${event.deltaY}`
  }

}

class Ground {

  constructor(editor) {

    this.editor = editor

    this.element = document.getElementById('ground')
    this.sceneElement = document.getElementById('scene')

    this.selection = {
      from: {
        x: 0,
        y: 0
      },
      to: {
        x: 0,
        y: 0
      }
    }

    this.groundMove = {
      from: {
        x: 0,
        y: 0
      },
      to: {
        x: 0,
        y: 0
      }
    }

    this.pointerTracker = new PointerTracker(this.sceneElement, {
      start: (pointer, event) => {
        if (this.pointerTracker.currentPointers.length === 2)
          return false;
        this.pointerStart(pointer, event)
        return true;
      },
      move: this.pointerMove.bind(this),
      end: this.pointerEnd.bind(this)
    })

    document.addEventListener('wheel', this.wheelMove.bind(this));

  }

  changeSize(size) {
    if (typeof size.width == 'number')
      this.element.style.width = `${size.width}px`
    if (typeof size.height == 'number')
      this.element.style.height = `${size.height}px`
  }

  changePosition(position) {
    if (typeof position.left == 'number')
      this.element.style.marginLeft = `${0 - position.left}px`
    if (typeof position.top == 'number')
      this.element.style.marginTop = `${0 - position.top}px`
  }

  changeScale(percentage) {
    this.element.style.scale = `${percentage}%`
  }

  pointerStart(pointer, event) {
    this.editor.graphicsDebugger.debugData.cursor['grabStatus'] = 'started'
    switch (this.editor.workspace.tools.selected) {
      case 'pointer':
        this.startSceneSelection(pointer, event)
        break;
      case 'hand':
        this.startGroundMove(pointer, event)
        break;
    }
  }

  pointerMove(previousPointers) {
    this.editor.graphicsDebugger.debugData.cursor['grabStatus'] = 'moving'
    switch (this.editor.workspace.tools.selected) {
      case 'pointer':
        this.updateSceneSelection(previousPointers)
        break;
      case 'hand':
        this.updateGroundMove(previousPointers)
        break;
    }
  }

  pointerEnd(event) {

    delete this.editor.graphicsDebugger.debugData.cursor['grabStatus']

    switch (this.editor.workspace.tools.selected) {
      case 'pointer':
        this.stopSceneSelection(event)
        break;
      case 'hand':
        this.stopGroundMove(event)
        break;
    }

  }

  startSceneSelection(pointer) {

    this.selection.from = {
      x: pointer.pageX - 3,
      y: pointer.pageY - 3
    }

    this.createObjectSelector(this.selection.from)

    this.editor.graphicsDebugger.debugData.cursor['selectionFrom'] = `x: ${this.selection.from.x} / y: ${this.selection.from.y}`

  }

  updateSceneSelection(pointers) {

    this.selection.to = {
      x: pointers[0].pageX - 3,
      y: pointers[0].pageY - 3
    }

    const { top, left, width, height } = this.updateObjectSelector(this.selection.from, this.selection.to)

    this.editor.graphicsDebugger.debugData.cursor['selectionFrom'] = `x: ${this.selection.from.x} / y: ${this.selection.from.y}`
    this.editor.graphicsDebugger.debugData.cursor['selectionTo'] = `x: ${this.selection.to.x} / y: ${this.selection.to.y}`
    this.editor.graphicsDebugger.debugData.cursor['selectionPos'] = `top: ${top} / left: ${left}`
    this.editor.graphicsDebugger.debugData.cursor['selectionSize'] = `width: ${width} / height: ${height}`

  }

  stopSceneSelection() {

    this.destroyObjectSelector()

    delete this.editor.graphicsDebugger.debugData.cursor['selectionFrom']
    delete this.editor.graphicsDebugger.debugData.cursor['selectionTo']
    delete this.editor.graphicsDebugger.debugData.cursor['selectionSize']
    delete this.editor.graphicsDebugger.debugData.cursor['selectionPos']

  }

  createObjectSelector(from) {

    this.selectionDom = document.createElement('div')
    this.selectionDom.id = 'sceneSelection'
    this.sceneElement.appendChild(this.selectionDom)

    this.selectionDom.style.top = `${from.y}px`
    this.selectionDom.style.left = `${from.x}px`
    this.selectionDom.style.width = `0px`
    this.selectionDom.style.height = `0px`

    this.selectionDom.style.borderWidth = `0px`

  }

  updateObjectSelector(from, to) {

    const top = to.y > from.y ? from.y : to.y
    const left = to.x > from.x ? from.x : to.x
    const width = to.x > from.x ? to.x - from.x : from.x - to.x
    const height = to.y > from.y ? to.y - from.y : from.y - to.y

    this.selectionDom.style.top = `${top}px`
    this.selectionDom.style.left = `${left}px`
    this.selectionDom.style.width = `${width}px`
    this.selectionDom.style.height = `${height}px`

    this.selectionDom.style.borderWidth = `1px`

    return { top, left, width, height }

  }

  destroyObjectSelector() {

    this.sceneElement.removeChild(this.selectionDom)

    this.selection = {
      from: {
        x: 0,
        y: 0
      },
      to: {
        x: 0,
        y: 0
      }
    }

  }

  startGroundMove(pointer) {

    this.groundMove.from = {
      x: pointer.pageX,
      y: pointer.pageY
    }

    this.groundInitialPos = this.editor.workspace.ground.position

    this.editor.graphicsDebugger.debugData.cursor['groundPosBefore'] = `top: ${this.editor.workspace.ground.position.top} / left: ${this.editor.workspace.ground.position.left}`


  }

  updateGroundMove(pointers) {

    this.groundMove.to = {
      x: pointers[0].pageX,
      y: pointers[0].pageY
    }

    const moveChangeX = this.groundMove.to.x - this.groundMove.from.x
    const moveChangeY = this.groundMove.to.y - this.groundMove.from.y

    this.editor.workspace.ground.position = {
      top: this.groundInitialPos.top - moveChangeY,
      left: this.groundInitialPos.left - moveChangeX
    }

    this.changePosition(this.editor.workspace.ground.position)
    this.editor.saveWorkspace()

    this.editor.graphicsDebugger.debugData.cursor['moveChange'] = `x: ${moveChangeX} / y: ${moveChangeY}`
    this.editor.graphicsDebugger.debugData.cursor['groundPosAfter'] = `top: ${this.editor.workspace.ground.position.top} / left: ${this.editor.workspace.ground.position.left}`

  }

  stopGroundMove() {

    this.groundMove = {
      from: {
        x: 0,
        y: 0
      },
      to: {
        x: 0,
        y: 0
      }
    }

    delete this.groundInitialPos

    delete this.editor.graphicsDebugger.debugData.cursor['moveChange']
    delete this.editor.graphicsDebugger.debugData.cursor['groundPosBefore']
    delete this.editor.graphicsDebugger.debugData.cursor['groundPosAfter']

  }

  wheelMove(event) {

    switch (this.editor.workspace.tools.selected) {
      case 'pointer':
        this.moveGround(event)
        break;
      case 'hand':
        this.scaleGround(event)
        break;
    }

  }

  moveGround(event) {

    const scale = event.deltaMode === 1 ? 15 : 0

    this.editor.workspace.ground.position = {
      top: this.editor.workspace.ground.position.top + event.deltaY * scale,
      left: this.editor.workspace.ground.position.left + event.deltaX * scale
    }

    this.changePosition(this.editor.workspace.ground.position)
    this.editor.saveWorkspace()

  }

  scaleGround(event) {

    const change = event.deltaY < 0 ? 1 : -1

    this.editor.workspace.ground.scale = this.editor.workspace.ground.scale + change * 10

    this.changeScale(this.editor.workspace.ground.scale)
    this.editor.saveWorkspace()

  }



}





// This part of code from https://github.com/GoogleChromeLabs/pinch-zoom/blob/master/dist/pinch-zoom.js
class Pointer {
  constructor(nativePointer) {
    /** Unique ID for this pointer */
    this.id = -1;
    this.nativePointer = nativePointer;
    this.pageX = nativePointer.pageX;
    this.pageY = nativePointer.pageY;
    this.clientX = nativePointer.clientX;
    this.clientY = nativePointer.clientY;
    if (self.Touch && nativePointer instanceof Touch) {
      this.id = nativePointer.identifier;
    }
    else if (isPointerEvent(nativePointer)) { // is PointerEvent
      this.id = nativePointer.pointerId;
    }
  }
  /**
   * Returns an expanded set of Pointers for high-resolution inputs.
   */
  getCoalesced() {
    if ('getCoalescedEvents' in this.nativePointer) {
      return this.nativePointer.getCoalescedEvents().map(p => new Pointer(p));
    }
    return [this];
  }
}
const isPointerEvent = (event) => self.PointerEvent && event instanceof PointerEvent;
const noop = () => { };
/**
 * Track pointers across a particular element
 */
class PointerTracker {
  /**
   * Track pointers across a particular element
   *
   * @param element Element to monitor.
   * @param callbacks
   */
  constructor(_element, callbacks) {
    this._element = _element;
    /**
     * State of the tracked pointers when they were pressed/touched.
     */
    this.startPointers = [];
    /**
     * Latest state of the tracked pointers. Contains the same number
     * of pointers, and in the same order as this.startPointers.
     */
    this.currentPointers = [];
    const { start = () => true, move = noop, end = noop, } = callbacks;
    this._startCallback = start;
    this._moveCallback = move;
    this._endCallback = end;
    // Bind methods
    this._pointerStart = this._pointerStart.bind(this);
    this._touchStart = this._touchStart.bind(this);
    this._move = this._move.bind(this);
    this._triggerPointerEnd = this._triggerPointerEnd.bind(this);
    this._pointerEnd = this._pointerEnd.bind(this);
    this._touchEnd = this._touchEnd.bind(this);
    // Add listeners
    if (self.PointerEvent) {
      this._element.addEventListener('pointerdown', this._pointerStart);
    }
    else {
      this._element.addEventListener('mousedown', this._pointerStart);
      this._element.addEventListener('touchstart', this._touchStart);
      this._element.addEventListener('touchmove', this._move);
      this._element.addEventListener('touchend', this._touchEnd);
    }
  }
  /**
   * Call the start callback for this pointer, and track it if the user wants.
   *
   * @param pointer Pointer
   * @param event Related event
   * @returns Whether the pointer is being tracked.
   */
  _triggerPointerStart(pointer, event) {
    if (!this._startCallback(pointer, event))
      return false;
    this.currentPointers.push(pointer);
    this.startPointers.push(pointer);
    return true;
  }
  /**
   * Listener for mouse/pointer starts. Bound to the class in the constructor.
   *
   * @param event This will only be a MouseEvent if the browser doesn't support
   * pointer events.
   */
  _pointerStart(event) {
    if (event.button !== 0 /* Left */)
      return;
    if (!this._triggerPointerStart(new Pointer(event), event))
      return;
    // Add listeners for additional events.
    // The listeners may already exist, but no harm in adding them again.
    if (isPointerEvent(event)) {
      this._element.setPointerCapture(event.pointerId);
      this._element.addEventListener('pointermove', this._move);
      this._element.addEventListener('pointerup', this._pointerEnd);
    }
    else { // MouseEvent
      window.addEventListener('mousemove', this._move);
      window.addEventListener('mouseup', this._pointerEnd);
    }
  }
  /**
   * Listener for touchstart. Bound to the class in the constructor.
   * Only used if the browser doesn't support pointer events.
   */
  _touchStart(event) {
    for (const touch of Array.from(event.changedTouches)) {
      this._triggerPointerStart(new Pointer(touch), event);
    }
  }
  /**
   * Listener for pointer/mouse/touch move events.
   * Bound to the class in the constructor.
   */
  _move(event) {
    const previousPointers = this.currentPointers.slice();
    const changedPointers = ('changedTouches' in event) ? // Shortcut for 'is touch event'.
      Array.from(event.changedTouches).map(t => new Pointer(t)) :
      [new Pointer(event)];
    const trackedChangedPointers = [];
    for (const pointer of changedPointers) {
      const index = this.currentPointers.findIndex(p => p.id === pointer.id);
      if (index === -1)
        continue; // Not a pointer we're tracking
      trackedChangedPointers.push(pointer);
      this.currentPointers[index] = pointer;
    }
    if (trackedChangedPointers.length === 0)
      return;
    this._moveCallback(previousPointers, trackedChangedPointers, event);
  }
  /**
   * Call the end callback for this pointer.
   *
   * @param pointer Pointer
   * @param event Related event
   */
  _triggerPointerEnd(pointer, event) {
    const index = this.currentPointers.findIndex(p => p.id === pointer.id);
    // Not a pointer we're interested in?
    if (index === -1)
      return false;
    this.currentPointers.splice(index, 1);
    this.startPointers.splice(index, 1);
    this._endCallback(pointer, event);
    return true;
  }
  /**
   * Listener for mouse/pointer ends. Bound to the class in the constructor.
   * @param event This will only be a MouseEvent if the browser doesn't support
   * pointer events.
   */
  _pointerEnd(event) {
    if (!this._triggerPointerEnd(new Pointer(event), event))
      return;
    if (isPointerEvent(event)) {
      if (this.currentPointers.length)
        return;
      this._element.removeEventListener('pointermove', this._move);
      this._element.removeEventListener('pointerup', this._pointerEnd);
    }
    else { // MouseEvent
      window.removeEventListener('mousemove', this._move);
      window.removeEventListener('mouseup', this._pointerEnd);
    }
  }
  /**
   * Listener for touchend. Bound to the class in the constructor.
   * Only used if the browser doesn't support pointer events.
   */
  _touchEnd(event) {
    for (const touch of Array.from(event.changedTouches)) {
      this._triggerPointerEnd(new Pointer(touch), event);
    }
  }
}
