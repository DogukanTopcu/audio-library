CREATE TABLE "user_question_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_choice_index" integer NOT NULL,
	"is_correct" boolean NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"time_spent_seconds" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_question_answers" ADD CONSTRAINT "user_question_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_answers" ADD CONSTRAINT "user_question_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;