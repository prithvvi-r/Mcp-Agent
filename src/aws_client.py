import boto3
from datetime import date, timedelta


class AWSClient:
    def __init__(self, region="ap-south-1"):
        self.ec2 = boto3.client("ec2", region_name=region)
        self.s3 = boto3.client("s3")
        self.logs = boto3.client("logs", region_name=region)
        self.iam = boto3.client("iam")
        self.ce = boto3.client("ce", region_name="us-east-1")

    def list_ec2_instances(self):
        res = self.ec2.describe_instances()
        instances = []

        for r in res["Reservations"]:
            for i in r["Instances"]:
                instances.append({
                    "id": i["InstanceId"],
                    "state": i["State"]["Name"],
                    "type": i["InstanceType"]
                })
        return instances

    def list_s3_buckets(self):
        res = self.s3.list_buckets()
        return [b["Name"] for b in res["Buckets"]]

    def list_iam_roles(self):
        res = self.iam.list_roles()
        return [r["RoleName"] for r in res["Roles"]]
    
    
    def get_cost_last_7_days(self):
        end = date.today()
        start = end - timedelta(days=7)

        response = self.ce.get_cost_and_usage(
            TimePeriod={
                "Start": start.strftime("%Y-%m-%d"),
                "End": end.strftime("%Y-%m-%d")
            },
            Granularity="DAILY",
            Metrics=["UnblendedCost", "AmortizedCost"],
            GroupBy=[
                {"Type": "DIMENSION", "Key": "SERVICE"}
            ]
        )

        data = []
        for day in response["ResultsByTime"]:
            day_entry = {
                "date": day["TimePeriod"]["Start"],
                "total_unblended": 0.0,
                "breakdown": []
            }
            
            for group in day["Groups"]:
                service = group["Keys"][0]
                unblended = float(group["Metrics"]["UnblendedCost"]["Amount"])
                amortized = float(group["Metrics"]["AmortizedCost"]["Amount"])
                
                if unblended > 0 or amortized > 0:
                    day_entry["breakdown"].append({
                        "service": service,
                        "unblended": round(unblended, 4),
                        "amortized": round(amortized, 4)
                    })
                    day_entry["total_unblended"] += unblended
            
            day_entry["total_unblended"] = round(day_entry["total_unblended"], 4)
            data.append(day_entry)

        return data
