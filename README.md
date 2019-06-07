# jeffers.io

A static site deployed on AWS with assets in an S3 bucket behind a
Cloudfront distribution.

See `infrastructure.template` for the CloudFormation setup.

## Creating the Stack

The `infrastructure.template` builds out all the AWS infrastrcture.

Something like

```
aws --profile jeffers.io.admin --region us-east-1 cloudformation create-stack \
  --stack-name dev-jeffers-io \
  --template-body file://infrastructure.template \
  --capabilities CAPABILITY_NAMED_IAM
  --parameters \
    ParameterKey=env,ParameterValue=dev \
    ParameterKey=branch,ParameterValue=develop
```

will get you going.

## Building

```
npm run build
```

## Local Dev

```
npm run serve
```

## Deployment

Auto-deploys with pushes to `develop` and `master` via a CodePipeline.

If you want to see immediate results live, invalidate the Cloudfront cache with:

```
aws --profile jeffers.io.admin cloudfront create-invalidation \
  --distribution-id <distribution_id> \
  --paths "/**/*"
```
