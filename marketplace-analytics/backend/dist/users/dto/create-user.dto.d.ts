import { SubscriptionPlan } from '../../common/constants';
export declare class CreateUserDto {
    email: string;
    password: string;
    name?: string;
    plan?: SubscriptionPlan;
}
