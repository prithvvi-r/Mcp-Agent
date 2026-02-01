from mcp.server.fastmcp import FastMCP
from aws_client import AWSClient

aws = AWSClient()

# Create MCP server
mcp = FastMCP("aws")

@mcp.tool()
def list_ec2_instances():
    """List EC2 instances with state and type."""
    return aws.list_ec2_instances()

@mcp.tool()
def list_s3_buckets():
    """List all S3 buckets."""
    return aws.list_s3_buckets()

@mcp.tool()
def list_iam_roles():
    """List IAM roles (read-only)."""
    return aws.list_iam_roles()

@mcp.tool()
def aws_cost_last_7_days():
    """Get AWS cost for the last 7 days (USD)."""
    return aws.get_cost_last_7_days()


if __name__ == "__main__":
    mcp.run()
