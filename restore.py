import json
import os

transcript_path = r'C:\Users\Usuario\.gemini\antigravity\brain\54ce1be8-6f25-45bd-b7e2-46f56c2a59dd\.system_generated\logs\transcript_full.jsonl'
target_dir = r'C:\Users\Usuario\.gemini\antigravity\scratch\riemann-explorer'

writes = {}
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            step = json.loads(line)
            if 'tool_calls' in step and step['tool_calls']:
                for tc in step['tool_calls']:
                    if tc.get('name') == 'default_api:write_to_file':
                        args = tc.get('arguments', {})
                        target = args.get('TargetFile', '')
                        if 'riemann-explorer' in target:
                            if target not in writes:
                                writes[target] = []
                            writes[target].append(args.get('CodeContent', ''))
        except Exception as e:
            pass

for target, contents in writes.items():
    if len(contents) > 1:
        # We know there are at least 2 versions (Claude Opus version, and Gemini version).
        # We restore the Claude Opus version (which is at index 0 or -2).
        old_content = contents[-2]
        with open(target, 'w', encoding='utf-8') as out:
            out.write(old_content)
        print(f'Restaurado: {os.path.basename(target)}')
