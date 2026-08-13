import urllib.request
import uuid
from pathlib import Path

p = Path('resume_test.txt')
p.write_text('Name: Test User\nEmail: test@example.com\nSkills: Python, FastAPI\nEducation: B.Tech\nExperience: Intern\n', encoding='utf-8')
boundary = '----' + str(uuid.uuid4())
body = b''
body += f'--{boundary}\r\n'.encode()
body += b'Content-Disposition: form-data; name="file"; filename="resume_test.txt"\r\n'
body += b'Content-Type: text/plain\r\n\r\n'
body += p.read_bytes()
body += f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="email"\r\n\r\ntest@example.com\r\n--{boundary}--\r\n'.encode()
req = urllib.request.Request('http://127.0.0.1:8001/resume/upload', data=body, method='POST')
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
with urllib.request.urlopen(req) as response:
    print(response.read().decode())
