import importlib.util
import json
import sys
from pathlib import Path

DRIVER = Path(__file__).resolve().parent.parent / 'python' / 'kernel_driver.py'
spec = importlib.util.spec_from_file_location('kernel_driver_under_test', DRIVER)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_python_safe_probes():
    driver = module.KernelDriver()
    driver.start(interpreter=sys.executable)
    try:
        # The hostile classes must live IN the kernel namespace; defining them
        # in this test process would only produce a NameError there.
        driver.execute("""
class Dangerous:
    def __repr__(self):
        raise AssertionError('repr must not be called')

    def __str__(self):
        raise AssertionError('str must not be called')
    def __format__(self, spec):
        raise AssertionError('format must not be called')

class DangerousCell:
    def __str__(self):
        raise AssertionError('custom DataFrame cell must not be stringified')

import numpy as np
import pandas as pd
safe_number = 12
safe_array = np.arange(12).reshape(3, 4)
safe_df = pd.DataFrame({'n': [1, 2], 'text': ['x', 'y'], 'obj': [object(), object()]})
dangerous_object = Dangerous()
safe_df_danger = pd.DataFrame({'d': [DangerousCell()]})
""")
        listed = driver.list_vars({'pattern': 'safe_', 'offset': 0, 'limit': 4, 'max_chars': 4096})
        assert listed['status'] == 'ok', listed
        assert {'name', 'type'} <= set(listed['vars'][0]), listed
        assert not ({'repr', 'value'} & set(listed['vars'][0])), listed
        assert any(item['name'] == 'safe_df' and item['shape'] == [2, 3] for item in listed['vars']), listed
        default = driver.inspect_object('dangerous_object')
        assert default['status'] == 'ok' and default['found'] and default['type'] == 'Dangerous', default
        assert 'preview' not in default
        unknown_preview = driver.inspect_object('dangerous_object', {'preview': True})
        assert unknown_preview['status'] == 'ok' and not unknown_preview['preview_available'], unknown_preview
        preview = driver.inspect_object('safe_df', {'preview': True, 'rows': 2, 'columns': 3})
        assert preview['status'] == 'ok' and preview['preview_available'], preview
        assert preview['preview']['rows'][0][0] == 1 and preview['preview']['rows'][0][1] == 'x', preview
        assert preview['preview']['rows'][0][2] == {'type': 'object'}, preview
        danger_frame = driver.inspect_object('safe_df_danger', {'preview': True})
        assert danger_frame['status'] == 'ok' and danger_frame['preview']['rows'][0][0] == {'type': 'DangerousCell'}, danger_frame
        arr = driver.inspect_object('safe_array', {'preview': True, 'rows': 3, 'columns': 3})
        assert arr['status'] == 'ok' and arr['shape'] == [3, 4], arr
        assert arr['preview']['values'][:3] == [0, 1, 2], arr
        missing = driver.inspect_object('__dsh_missing__')
        assert missing['status'] == 'ok' and not missing['found'], missing
        assert 'repr(' not in module.R_LIST_VARS + module.R_INSPECT_OBJECT
    finally:
        driver.stop()


def test_not_started_and_busy_are_explicit():
    driver = module.KernelDriver()
    assert driver.list_vars()['status'] == 'not_started'
    assert driver.inspect_object('x')['status'] == 'not_started'

    class FakeChannel:
        def __init__(self, messages):
            self.messages = list(messages)

        def get_msg(self, timeout=0):
            if not self.messages:
                raise TimeoutError()
            return self.messages.pop(0)

    class FakeClient:
        def __init__(self, messages):
            self.iopub_channel = FakeChannel(messages)

    driver.kc = FakeClient([{
        'header': {'msg_type': 'status'},
        'parent_header': {'msg_id': 'currently-running-cell'},
        'content': {'execution_state': 'busy'},
    }])
    driver._external_busy_msg_id = None
    driver._kernel_busy = False
    assert driver.list_vars()['status'] == 'busy'


def test_options_are_clamped():
    opts = module.KernelDriver._probe_options(
        {'offset': -5, 'limit': 99999, 'max_chars': 1},
        {'offset': 0, 'limit': module.PROBE_DEFAULT_LIST_LIMIT, 'max_chars': module.PROBE_DEFAULT_MAX_CHARS},
        {'offset': 1000000000, 'limit': module.PROBE_MAX_LIST_LIMIT, 'max_chars': module.PROBE_MAX_MAX_CHARS},
    )
    assert opts == {'offset': 0, 'limit': module.PROBE_MAX_LIST_LIMIT, 'max_chars': module.PROBE_MIN_MAX_CHARS}


if __name__ == '__main__':
    test_python_safe_probes()
    test_not_started_and_busy_are_explicit()
    test_options_are_clamped()
    print('safe introspection checks passed')
