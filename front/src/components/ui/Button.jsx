import { btn } from './buttonStyles';

export default function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return <button className={`${btn(variant, size)} ${className}`} {...props} />;
}
