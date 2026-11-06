"""Run with: python tools/agent-usage/claude_budget_hook_test.py"""
import json, subprocess, sys, tempfile, unittest
from pathlib import Path

HOOK = Path(__file__).with_name('claude_budget_hook.py')


def assistant(tokens, model='claude-sonnet-5-5'):
    usage = {'input_tokens': 2, 'cache_creation_input_tokens': 0, 'cache_read_input_tokens': tokens - 2}
    return json.dumps({'type': 'assistant', 'message': {'id': 'm', 'model': model, 'usage': usage}})


class Hook(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.main = Path(self.dir.name) / 'session.jsonl'
        self.worker = Path(self.dir.name) / 'session' / 'subagents' / 'agent-abc.jsonl'
        self.worker.parent.mkdir(parents=True)

    def run_hook(self, agent=None, flags=()):
        payload = {'transcript_path': str(self.main)}
        if agent:
            payload['agent_id'] = agent
        result = subprocess.run([sys.executable, str(HOOK), *flags], input=json.dumps(payload),
                                capture_output=True, text=True, check=True)
        if not result.stdout:
            return None
        return json.loads(result.stdout)['hookSpecificOutput']['additionalContext']

    def test_worker_thresholds_follow_the_model(self):
        self.worker.write_text(assistant(134999) + '\n')
        self.assertIsNone(self.run_hook('abc'))
        self.worker.write_text(assistant(135000) + '\n')
        self.assertIn('HANDOFF', self.run_hook('abc'))
        self.worker.write_text(assistant(78000, 'claude-haiku-5-5') + '\n')
        self.assertIn('HANDOFF', self.run_hook('abc'))

    def test_worker_reads_its_own_transcript_not_the_parents(self):
        self.main.write_text(assistant(200000) + '\n')
        self.worker.write_text(assistant(1000) + '\n')
        self.assertIsNone(self.run_hook('abc'))

    def test_handler_stages(self):
        self.main.write_text(assistant(174999, 'claude-opus-5-5') + '\n')
        self.assertIsNone(self.run_hook())
        self.main.write_text(assistant(175000, 'claude-opus-5-5') + '\n')
        self.assertIn('BUDGET SOFT', self.run_hook())
        self.main.write_text(assistant(215000, 'claude-opus-5-5') + '\n')
        self.assertIn('BUDGET HANDOFF', self.run_hook())
        self.main.write_text(assistant(190000) + '\n')
        self.assertIn('BUDGET HANDOFF', self.run_hook())

    def test_latest_request_wins_and_synthetic_messages_are_skipped(self):
        synthetic = json.dumps({'type': 'assistant', 'message': {'model': '<synthetic>', 'usage': {'input_tokens': 900000}}})
        self.worker.write_text('\n'.join([assistant(140000), assistant(1000), synthetic, 'not json']) + '\n')
        self.assertIsNone(self.run_hook('abc'))

    def test_sample_older_than_the_tail_is_still_found(self):
        filler = json.dumps({'type': 'user', 'message': {'content': 'x' * (600 * 1024)}})
        self.worker.write_text(assistant(140000) + '\n' + filler + '\n')
        self.assertIn('HANDOFF', self.run_hook('abc'))

    def test_missing_telemetry_is_silent(self):
        self.assertIsNone(self.run_hook('missing'))
        self.worker.write_text('{"type":"user"}\n')
        self.assertIsNone(self.run_hook('abc'))


if __name__ == '__main__':
    unittest.main()
