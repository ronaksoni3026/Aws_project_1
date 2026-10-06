output "alb_dns_name" {
  description = "Public DNS URL of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "s3_resumes_bucket" {
  description = "Name of the S3 bucket created for student resumes"
  value       = aws_s3_bucket.resumes_bucket.id
}

output "rds_endpoint" {
  description = "Connection endpoint of PostgreSQL RDS database"
  value       = aws_db_instance.postgres.endpoint
}
