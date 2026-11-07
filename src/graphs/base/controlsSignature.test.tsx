import React from 'react';
import {render} from '@testing-library/react';
import {controlsSignature} from './realGraphTestHarness';
import {LiveReadout, SettledReadout} from './controls/LiveReadout';

const signature = (ui: React.ReactElement) => controlsSignature(render(ui).container);

test('an aria-disabled input and button show as unavailable, like a disabled input', () => {
    const lines = signature(<div>
        <input type="number" defaultValue="3" aria-disabled="true"/>
        <input type="number" defaultValue="4" disabled/>
        <input type="number" defaultValue="5"/>
        <button aria-disabled="true">Next</button>
        <button aria-pressed="false" aria-disabled="true">Play</button>
        <button aria-pressed="true">Pause</button>
        <button>Plain</button>
    </div>);
    expect(lines).toEqual(['number:3:disabled', 'number:4:disabled', 'number:5', 'button:Next:unavailable', 'button:Play:false:unavailable', 'button:Pause:true']);
});

test('a live readout is not part of the signature, a notice status is', () => {
    const readout = new SettledReadout();
    readout.report('κ = 2');
    const lines = signature(<div><LiveReadout readout={readout}/><p role="status">Notice</p></div>);
    expect(lines).toEqual(['status:Notice']);
});
