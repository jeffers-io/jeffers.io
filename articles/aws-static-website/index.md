# CI/CD Your AWS Static Site For Fun Kinda

Don't you hate it when you start in on some project and it's *way*
over-complicated and over-engineered and you have to spend hours just getting
caught up on how basic stuff is set up?

Anyway, let's walk through creating a 225+ line [AWS CloudFormation template](https://github.com/jeffers-io/jeffers.io/blob/master/infrastructure.template) for
hosting a simple static website...

## S3 and CloudFront

Throwing a static website up on AWS is pretty great. You basically just create
an S3 bucket, flag it for "static website hosting", and `aws s3 cp index.html
s3://your-bucket` and you are a member of the World Wide Web.

Thirty seconds after that you'll realize you want to register your custom domain
through Route53, and five minutes later you'll realize you want a CloudFront
distribution in front of your bucket. CloudFront lets you get your HTTPS on with
a free Amazon-provided TLS certificate and you can point a Route53 A Record at
your CloudFront distribution alias.

You're definitely *technically* done at this point...but why not throw in some
of the (actually pretty nice) AWS CI/CD tooling while you're at it.

## CodeBuild

The number of **Code\*** offerings on the AWS dashboard is a little confusing at
first (there's even one actually called CodeStar) but for static-asset sites
just hone in on **CodeBuild** and **CodePipeline**.

CodeBuild is yer classic CI "build" server in a serverless easy-to-configure
form. Check out this bit of CloudFormation template:

```yaml
  build:
    Type: "AWS::CodeBuild::Project"
    DependsOn: "codeBuildRole"
    Properties:
      Name: !Sub "${env}-jeffers-io"
      Description: !Sub "The jeffers.io ${env} website build"
      ServiceRole: !Ref "codeBuildRole"
      Environment:
        ComputeType: "BUILD_GENERAL1_SMALL"
        Image: "aws/codebuild/standard:2.0"
        Type: "LINUX_CONTAINER"
      Source:
        Auth:
          Type: "OAUTH"
        Location: "https://github.com/jeffers-io/jeffers.io.git"
        ReportBuildStatus: true
        Type: "GITHUB"
      Triggers:
        FilterGroups:
          -
            -
              Pattern: "PULL_REQUEST_CREATED,PULL_REQUEST_UPDATED"
              Type: "EVENT"
        Webhook: true
      Artifacts:
        Location: !Ref "artifactsBucket"
        OverrideArtifactName: true
        Packaging: "ZIP"
        Type: "S3"
      BadgeEnabled: false
```

There's several parts to this setup:

**buildspec.yml:** Put this in the root of your project. It's straightforward.
Give it a runtime (we're using Node.js) and a list of commands (run-of-the-mill
static website CSS/SVG minification and file moving-around happens in a bash
script) and you're done. Notice the weird `chmod a+x build.sh` though...AWS can
lose track of file executable perms in the pull process so you might need stuff
like this. Timestamp your artifact here for easy rollbacks later.

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 10
    commands:
      - npm install
      - chmod a+x build.sh
  build:
    commands:
      - npm run build
artifacts:
  files:
    - "**/*"
  base-directory: dist
  name: bundle-$(date +%s)
```

**Service Role:** the necessary evil of using any AWS service. You have to get a
good handle on who is doing what and if they're allowed to do that stuff. This
will be taken care of for you if you're using the Web Console to set this up but
that's only for not-cool peops. (Disclosure: every part of this setup was
created first-time-through via the Console because CloudFormation template
writing from scratch can be sometimes mysterious.)

The
[docs](https://docs.aws.amazon.com/codebuild/latest/userguide/setting-up.html#setting-up-service-role)
explain. This is a "service role" so you need to make sure the
service `codebuild.amazonaws.com` can "assume the role" with an "Assume Role
Policy Document" and *then* you need to write a policy document to cover all the
operations your project will engage in. For static-site building and deploying,
you need full ECR/ECS access (so CodeBuild can get the build environment
container running, more below), S3 bucket access (for storing artifacts) and the
usual CloudWatch Logs perms.

**Environment:** One of the nice and easy things about CodeBuild. When you build
your project you need a particular dev environment set up. Eg, a certain version
of Node.js and some standard Linux commands. You're tell CodeBuild "give me a
standard Ubuntu container with this much compute resources". You can also
specify custom containers and pull them down from ECR at build-time to get
fancier/faster with your builds.

**Source:** Where to get your codez. AWS CodeCommit is the easiest, but the
GitHub integration works great too once you get the config down. Later on in the
CodePipeline section you set up a GitHub Personal Access Token and that takes
care of auth.

**Triggers:** CodeBuild even sets up a Webhook for you. Just `Webhook: true`
will get this build building for all your repo's events, but we actually want
the *CodePipeline* to respond to those and so here we filter down to just pull
request events.

**Artifacts:** The results of the build. Give it a bucket, tell it to override
the name (so your custom `buildspec.yml` name gets used instead) and have it zip
up the results.

## CodePipeline

Exactly what is sounds like: a sequence of CI/CD operations that you trigger off
certain events. This *consumes* your previously defined CodeBuild process and
adds on deployment. You also have to define the Sources (yes, even though you
already did that in CodeBuild) and you'll also automatically get a GitHub Webhook
to kick off your builds.

One note: don't get sidetracked on *CodeDeploy* when trying to deploy your
static assets into your S3 bucket. S3 itself is a "deploy provider" and you just
give CodePipeline your bucket details to get it to unzip and dump your assets
into your website bucket.

## CloudFormation

We're purposely being thorough here. So the last step is to put all of this
into a CloudFormation template, parameterize it, and deploy a `dev` and `prod`
version.

Making these templates the first time is a LOT of time-consuming
trial-and-error...but it *is* really nice to have your whole setup formally
defined. And you get your subsequent environments with just an additional AWS
CLI call.

Bam. Make some local changes on `develop`, push, review the real thing on
`dev.lotsa-work-for-website-deploy.com` and then merge and push master to get
the real thing out there.
