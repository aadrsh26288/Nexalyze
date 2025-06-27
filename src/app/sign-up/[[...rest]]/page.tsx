import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
	return (
		<div className='flex items-center justify-center h-screen bg-[#0A0A0A]'>
			<div className='scale-[0.8] max-w-[400px]'>
				<SignUp />
			</div>
		</div>
	);
}
