# 온라인 관리자 배포

현재 상태: 로그인과 배포 설정을 구현했습니다. 실제 서버 및 DNS 연결은 별도로 필요합니다. 기존 GitHub Pages 홈페이지는 유지하고, 관리자만 항상 실행되는 Linux 서버에서 운영합니다. Docker Compose 단일 인스턴스 구성입니다. 서버 비용은 선택한 업체에 따릅니다.

## 연결 전 준비

- 실제 관리자 주소(예: `admin.example.com`)와 DNS 관리 권한
- Docker Compose를 실행할 Linux 서버 및 80/443 포트 접근
- 이 변경 사항이 포함된 프로젝트 코드
- 이 저장소만 접근할 수 있는 GitHub fine-grained token (`Contents: Read and write`)
- 관리자 아이디 및 12자 이상의 비밀번호

비밀번호와 토큰을 대화나 Git에 올리지 마세요. 서버의 `admin/hosting/.env`에만 보관하고 파일 권한을 제한하세요. 해당 파일은 Git과 Docker 이미지에서 제외됩니다.

## 시작

1. DNS에 `admin` A 레코드를 서버의 공인 IP로 지정합니다. 기존 홈페이지 레코드는 유지합니다. IPv6를 쓰지 않으면 admin의 AAAA 레코드를 추가하지 마세요.
2. 서버에서 프로젝트를 준비하고 `admin/hosting/.env.example`을 같은 폴더의 `.env`로 복사합니다.
3. 프로젝트 폴더에서 `npm ci` 후 `npm run admin:password`를 실행합니다. 입력은 화면에 표시되지 않습니다. 출력된 해시를 `ADMIN_PASSWORD_HASH`에 넣습니다. `ADMIN_USERNAME`, `ADMIN_DOMAIN`, `GITHUB_TOKEN`을 채웁니다.
4. `admin/hosting` 폴더에서 `docker compose up -d --build`를 실행합니다. Caddy가 HTTPS 인증서를 발급하고 HTTP를 HTTPS로 전환합니다. 앱의 4848 포트는 외부로 공개하지 않습니다.
5. 관리자 HTTPS 주소에서 로그인합니다. Site의 Mux/DeepL 연결을 설정합니다. 기존 컴퓨터에 저장된 키는 서버로 자동 복사되지 않습니다.
6. 테스트 콘텐츠를 저장한 뒤 사이트에 배포하고, GitHub Actions 성공 및 공개 사이트 반영을 확인합니다. 실제 Mux 영상 업로드·연결도 확인합니다.

## 저장과 배포

텍스트·이미지·PDF 및 기존 로컬 영상은 서버의 영구 저장소 안 Git 작업 사본에 저장됩니다. Mux에 올린 영상은 계속 Mux에 보관됩니다. 기존 Lab/갤러리의 파일 영상 업로드는 Git에 저장되는 방식도 지원하므로 모든 영상이 Mux로 자동 이전되는 것은 아닙니다.

`저장`은 초안 저장, `사이트에 배포`는 commit/push이며 기존 GitHub Pages 배포를 실행합니다. GitHub 토큰으로 push해야 배포 워크플로가 실행될 수 있습니다. GitHub의 새 변경이 서버보다 앞서 있으면 배포를 막고 초안을 유지합니다. 강제 push하거나 초안을 초기화하지 말고 서버 작업 사본을 백업 후 병합하세요. 초안이 없는 서버 재시작에서는 최신 GitHub 커밋으로 fast-forward합니다.

repository 볼륨에는 초안과 미전송 커밋, settings 볼륨에는 Mux/DeepL 설정과 업로드 기록이 있습니다. 둘 다 백업해야 합니다. `docker compose down -v`는 이 데이터를 삭제하므로 사용하지 마세요. 서버 이미지를 업데이트하려면 프로젝트 코드를 갱신한 후 `docker compose up -d --build`를 실행합니다. 의존성이 변경된 경우 런타임 checkout의 package-lock과 이미지의 package-lock도 맞춰야 합니다.

로그인은 최대 8시간 유지되고 재시작하면 다시 로그인해야 합니다. 단일 인스턴스용 메모리 세션과 로그인 시도 제한을 사용합니다. 여러 서버로 확장할 때는 공유 세션/시도 제한 저장소가 필요합니다. 현재 프록시 뒤에서는 로그인 제한이 서버 전체에 적용됩니다. 비밀번호 변경/분실 시 새 해시를 만들고 `.env`를 바꾼 다음 컨테이너를 재생성하면 기존 세션도 만료됩니다. 공개 회원가입 및 비밀번호 재설정 이메일은 제공하지 않습니다.

## 로컬 사용

환경 변수를 지정하지 않은 `npm run admin`은 기존처럼 `127.0.0.1:4848`에서만 실행됩니다. `ADMIN_USERNAME`과 `ADMIN_PASSWORD_HASH`를 함께 지정하면 로컬에서도 로그인할 수 있습니다. 온라인 모드에서는 로그인 정보와 정확한 HTTPS `ADMIN_ORIGIN`이 없으면 시작하지 않습니다.

## 검증

`npm run test:admin`으로 인증, 세션 만료/로그아웃, 출처 위조, 로그인 시도 제한, 기존 Mux·번역 테스트를 실행합니다. 배포 환경에서는 추가로 HTTPS 인증서, DNS, 데이터 보존, 실제 GitHub push/Pages, 실제 Mux 업로드를 확인해야 합니다.

참고: [Express 보안 권장 사항](https://expressjs.com/en/advanced/best-practice-security/), [Caddy 자동 HTTPS](https://caddyserver.com/docs/automatic-https).
