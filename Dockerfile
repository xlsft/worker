FROM denoland/deno:latest
COPY . ./app
RUN ls -la
CMD ["run", "-A", "--unstable-cron", "app/src/main.ts"]