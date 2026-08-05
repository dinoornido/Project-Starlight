# Academy of Being — public deploy

Static package for nginx root `/var/www/kaditech-starlight`.

## Live URL (after deploy)
https://kaditech.com/Academyofbeing/

## Deploy from LAN (ThinkPad / TA2026)
```bash
cd www
HOST=root@192.168.1.98 PASS=Panda88 ./DEPLOY_ACADEMY.sh
```

Or rsync manually:
```bash
rsync -avz Academyofbeing/ root@192.168.1.98:/var/www/kaditech-starlight/Academyofbeing/
rsync -avz index.html root@192.168.1.98:/var/www/kaditech-starlight/index.html
rsync -avz apps/index.html root@192.168.1.98:/var/www/kaditech-starlight/apps/index.html
ssh root@192.168.1.98 'nginx -t && systemctl reload nginx'
```

## Features (public static)
- Join Path, lessons, dashboard cartoon avatar + voice gate
- Schedule (infrastructure caps), class gate, Headmaster acts
- Ordered to the good · God alone is God
