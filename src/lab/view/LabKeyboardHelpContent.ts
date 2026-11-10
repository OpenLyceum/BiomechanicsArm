/**
 * LabKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar):
 * the two measurement shortcuts, the demo slider, and the basic actions.
 */

import { HotkeyData } from "scenerystack/scenery";
import {
  BasicActionsKeyboardHelpSection,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  SliderControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import { StringManager } from "../../i18n/StringManager.js";

const strings = () => StringManager.getInstance().getLabA11yStrings().keyboardHelp;

/** Alt+P records a point (Alt+R is already Reset All) from anywhere on the screen. */
export const RECORD_POINT_HOTKEY_DATA = new HotkeyData({
  keys: ["alt+p"],
  repoName: "biomechanics-arm",
  keyboardHelpDialogLabelStringProperty: strings().recordPointStringProperty,
  global: true,
});

/** Alt+0 zeroes both sensors from anywhere on the screen. */
export const ZERO_BOTH_HOTKEY_DATA = new HotkeyData({
  keys: ["alt+0"],
  repoName: "biomechanics-arm",
  keyboardHelpDialogLabelStringProperty: strings().zeroBothStringProperty,
  global: true,
});

export class LabKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const measurements = new KeyboardHelpSection(strings().headingStringProperty, [
      KeyboardHelpSectionRow.fromHotkeyData(RECORD_POINT_HOTKEY_DATA),
      KeyboardHelpSectionRow.fromHotkeyData(ZERO_BOTH_HOTKEY_DATA),
    ]);
    super([measurements, new SliderControlsKeyboardHelpSection()], [new BasicActionsKeyboardHelpSection()]);
  }
}
