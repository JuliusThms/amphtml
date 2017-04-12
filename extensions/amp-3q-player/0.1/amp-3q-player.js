/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {isLayoutSizeDefined} from '../../../src/layout';
import {tryParseJson} from '../../../src/json';
import {user} from '../../../src/log';
import {removeElement} from '../../../src/dom';
import {
  installVideoManagerForDoc,
} from '../../../src/service/video-manager-impl';
import {isObject} from '../../../src/types';
import {VideoEvents} from '../../../src/video-interface';
import {videoManagerForDoc} from '../../../src/services';

/**
 * @implements {../../../src/video-interface.VideoInterface}
 */
class Amp3QPlayer extends AMP.BaseElement {

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?Element} */
    this.iframe_ = null;

    /** @private {?Promise} */
    this.playerReadyPromise_ = null;

    /** @private {?Function} */
    this.playerReadyResolver_ = null;
  }

  /**
   * @param {boolean=} opt_onLayout
   * @override
   */
  preconnectCallback(opt_onLayout) {
    this.preconnect.url('https://playout.3qsdn.com', opt_onLayout);
  }

  /** @override */
  buildCallback() {
    const iframe = this.element.ownerDocument.createElement('iframe');
    this.iframe_ = iframe;

    this.forwardEvents([VideoEvents.PLAY, VideoEvents.PAUSE], iframe);
    this.applyFillContent(iframe, true);
    this.element.appendChild(iframe);

    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');

    installVideoManagerForDoc(this.element);
    videoManagerForDoc(this.element).register(this);
  }

  /** @override */
  layoutCallback() {

    const dataId = user().assert(
        this.element.getAttribute('data-id'),
        'The data-id attribute is required for <amp-3q-player> %s',
        this.element);

    const src = 'https://playout.3qsdn.com/' + encodeURIComponent(dataId) + '?autoplay=false&amp=true';
    this.iframe_.src = src;

    this.win.addEventListener('message',
                            event => this.sdnBridge_(event));

    this.playerReadyResolver_ = this.loadPromise(this.iframe_);
    return this.playerReadyResolver_;
  }

  /** @override */
  unlayoutCallback() {
    if (this.iframe_) {
      removeElement(this.iframe_);
      this.iframe_ = null;
    }
    return true;
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
  }

  /** @override */
  viewportCallback(visible) {
    this.element.dispatchCustomEvent(VideoEvents.VISIBILITY, {visible});
  }

  /** @override */
  pauseCallback() {
    if (this.iframe_) {
      this.pause();
    }
  }

  sdnBridge_(event) {

    //console.log('sdnPlayer: '+event.data);

    if (event.source) {
      if (event.source != this.iframe_.contentWindow) {
        return;
      }
    }

    const data = isObject(event.data) ? event.data : tryParseJson(event.data);
    if (data === undefined) {
      return;
    }

    switch (data.data) {
      case 'playing':
        this.element.dispatchCustomEvent(VideoEvents.PLAY);
        break;
      case 'paused':
        this.element.dispatchCustomEvent(VideoEvents.PAUSE);
        break;
      case 'muted':
        this.element.dispatchCustomEvent(VideoEvents.MUTED);
        break;
      case 'unmuted':
        this.element.dispatchCustomEvent(VideoEvents.UNMUTED);
        break;
    }
  }

  sdnPostMessage_(message) {
    console.log('sdnPlayer postMessage: ' + message);
    if (this.iframe_ && this.iframe_.contentWindow) {
          this.iframe_.contentWindow./*OK*/postMessage(message, '*');
        }
  }

  // VideoInterface Implementation. See ../src/video-interface.VideoInterface

  /** @override */
  play() {
    this.sdnPostMessage_('play2');
  }

  /** @override */
  pause() {
    this.sdnPostMessage_('pause');
  }

  /** @override */
  mute() {
    this.sdnPostMessage_('mute');
  }

  /** @override */
  unmute() {
    this.sdnPostMessage_('unmute');
  }

  /** @override */
  supportsPlatform() {
    return true;
  }

  /** @override */
  isInteractive() {
    return true;
  }

  /** @override */
  showControls() {
    this.sdnPostMessage_('showControlbar');
  }

  /** @override */
  hideControls() {
    this.sdnPostMessage_('hideControlbar');
  }

};

AMP.registerElement('amp-3q-player', Amp3QPlayer);
